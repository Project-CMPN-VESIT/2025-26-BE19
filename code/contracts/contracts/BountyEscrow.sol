// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BountyEscrow
 * @notice Single-program escrow contract for decentralized bug bounties.
 *         Supports report lifecycle, partial payouts, disputes, and auto-release.
 */
contract BountyEscrow is AccessControl, ReentrancyGuard {
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    enum ReportStatus {
        None,
        Submitted,
        Approved,
        Rejected,
        Disputed,
        Paid
    }

    struct Report {
        address researcher;
        bytes32 reportHash;
        uint96 approvedAmount;
        uint64 submittedAt;
        uint64 reviewedAt;
        uint64 disputedAt;
        ReportStatus status;
        bool paidOut;
    }

    // Program metadata
    address public organization;
    address public arbiter;
    bool public bountyInitialized;
    bool public bountyClosed;
    string public metadataURI;
    uint64 public autoReleaseWindow;
    uint64 public disputeWindow;

    // Escrow balances
    uint96 public totalFunded;
    uint96 public totalReserved;
    uint96 public totalPaidOut;

    // Reports
    uint256 public reportCount;
    mapping(uint256 => Report) public reports;
    mapping(bytes32 => bool) public reportHashUsed;

    // Custom errors (gas-optimized)
    error NotOrganization();
    error NotResearcher();
    error NotArbiter();
    error BountyAlreadyInitialized();
    error BountyNotInitialized();
    error BountyClosedError();
    error InvalidAmount();
    error InvalidAddress();
    error InvalidReport();
    error InvalidState();
    error DuplicateReportHash();
    error InsufficientEscrow();
    error DisputeWindowExpired();
    error AutoReleaseNotReady();
    error PendingReservedPayouts();
    error TransferFailed();

    // Required lifecycle events
    event BountyCreated(
        address indexed organization,
        address indexed arbiter,
        string metadataURI,
        uint64 autoReleaseWindow,
        uint64 disputeWindow,
        uint256 initialFunding
    );
    event Funded(address indexed funder, uint256 amount, uint256 totalFunded);
    event ReportSubmitted(uint256 indexed reportId, address indexed researcher, bytes32 indexed reportHash);
    event ReportApproved(uint256 indexed reportId, address indexed reviewer, uint256 payoutAmount);
    event ReportRejected(uint256 indexed reportId, address indexed reviewer, string reason);
    event ReportDisputed(uint256 indexed reportId, address indexed researcher, string reason);
    event DisputeResolved(uint256 indexed reportId, bool approved, uint256 payoutAmount);
    event PayoutReleased(uint256 indexed reportId, address indexed researcher, uint256 amount, address releasedBy);
    event BountyClosed(address indexed organization, uint256 refundedAmount);

    // Legacy compatibility events
    event BountyDeposited(address indexed org, uint256 amount);
    event BountyPaid(address indexed researcher, uint256 amount);

    constructor(address relayer) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        if (relayer != address(0)) {
            _grantRole(RELAYER_ROLE, relayer);
        }
    }

    modifier whenInitialized() {
        if (!bountyInitialized) revert BountyNotInitialized();
        _;
    }

    modifier whenActive() {
        if (bountyClosed) revert BountyClosedError();
        _;
    }

    modifier onlyOrg() {
        if (msg.sender != organization && !hasRole(RELAYER_ROLE, msg.sender)) revert NotOrganization();
        _;
    }

    modifier onlyArbiter() {
        if (msg.sender != arbiter && msg.sender != organization && !hasRole(RELAYER_ROLE, msg.sender)) revert NotArbiter();
        _;
    }

    modifier onlyResearcherAddress(address researcher) {
        if (
            msg.sender != researcher &&
            !hasRole(RELAYER_ROLE, msg.sender)
        ) revert NotResearcher();
        _;
    }

    modifier onlyReportResearcher(uint256 reportId) {
        Report storage report = reports[reportId];
        if (report.status == ReportStatus.None) revert InvalidReport();
        if (
            msg.sender != report.researcher &&
            !hasRole(RELAYER_ROLE, msg.sender)
        ) revert NotResearcher();
        _;
    }

    /**
     * @notice Initializes bounty configuration once.
     * @dev If caller is relayer, `organization_` is the effective owner.
     */
    function createBounty(
        address organization_,
        string calldata metadataURI_,
        address arbiter_,
        uint64 autoReleaseWindow_,
        uint64 disputeWindow_
    ) external payable {
        if (bountyInitialized) revert BountyAlreadyInitialized();
        if (organization_ == address(0)) revert InvalidAddress();

        bool isRelayer = hasRole(RELAYER_ROLE, msg.sender);
        if (!isRelayer && msg.sender != organization_) revert NotOrganization();

        organization = organization_;
        arbiter = arbiter_ == address(0) ? organization_ : arbiter_;
        metadataURI = metadataURI_;
        autoReleaseWindow = autoReleaseWindow_ == 0 ? uint64(2 days) : autoReleaseWindow_;
        disputeWindow = disputeWindow_ == 0 ? uint64(3 days) : disputeWindow_;
        bountyInitialized = true;

        if (msg.value > 0) {
            totalFunded += uint96(msg.value);
            emit Funded(msg.sender, msg.value, totalFunded);
            emit BountyDeposited(msg.sender, msg.value);
        }

        emit BountyCreated(organization_, arbiter, metadataURI_, autoReleaseWindow, disputeWindow, msg.value);
    }

    function fundBounty() external payable whenInitialized whenActive onlyOrg {
        _fund(msg.value, msg.sender);
    }

    /**
     * @notice Submit report hash. Supports relayed submissions.
     * @param researcher Address of report author.
     */
    function submitReportHash(address researcher, bytes32 reportHash) external whenInitialized whenActive onlyResearcherAddress(researcher) returns (uint256 reportId) {
        if (researcher == address(0) || researcher == organization) revert InvalidAddress();
        if (reportHash == bytes32(0)) revert InvalidReport();
        if (reportHashUsed[reportHash]) revert DuplicateReportHash();

        reportHashUsed[reportHash] = true;
        unchecked {
            reportCount += 1;
        }
        reportId = reportCount;

        reports[reportId] = Report({
            researcher: researcher,
            reportHash: reportHash,
            approvedAmount: 0,
            submittedAt: uint64(block.timestamp),
            reviewedAt: 0,
            disputedAt: 0,
            status: ReportStatus.Submitted,
            paidOut: false
        });

        emit ReportSubmitted(reportId, researcher, reportHash);
    }

    function approveReport(uint256 reportId, uint96 payoutAmount) external whenInitialized whenActive onlyOrg {
        if (payoutAmount == 0) revert InvalidAmount();

        Report storage report = reports[reportId];
        if (report.status != ReportStatus.Submitted && report.status != ReportStatus.Disputed) revert InvalidState();

        if (uint256(payoutAmount) > availableEscrow()) revert InsufficientEscrow();

        report.approvedAmount = payoutAmount;
        report.reviewedAt = uint64(block.timestamp);
        report.status = ReportStatus.Approved;
        totalReserved += payoutAmount;

        emit ReportApproved(reportId, msg.sender, payoutAmount);
    }

    function rejectReport(uint256 reportId, string calldata reason) external whenInitialized whenActive onlyOrg {
        Report storage report = reports[reportId];
        if (report.status != ReportStatus.Submitted && report.status != ReportStatus.Disputed) revert InvalidState();

        report.reviewedAt = uint64(block.timestamp);
        report.status = ReportStatus.Rejected;

        emit ReportRejected(reportId, msg.sender, reason);
    }

    function disputeReport(uint256 reportId, string calldata reason) external whenInitialized whenActive onlyReportResearcher(reportId) {
        Report storage report = reports[reportId];
        if (report.status != ReportStatus.Approved && report.status != ReportStatus.Rejected) revert InvalidState();
        if (report.reviewedAt == 0 || block.timestamp > uint256(report.reviewedAt) + disputeWindow) {
            revert DisputeWindowExpired();
        }

        report.status = ReportStatus.Disputed;
        report.disputedAt = uint64(block.timestamp);

        emit ReportDisputed(reportId, report.researcher, reason);
    }

    function resolveDispute(
        uint256 reportId,
        bool approve,
        uint96 payoutAmount
    ) external whenInitialized whenActive onlyArbiter {
        Report storage report = reports[reportId];
        if (report.status != ReportStatus.Disputed) revert InvalidState();

        if (approve) {
            uint96 finalAmount = payoutAmount == 0 ? report.approvedAmount : payoutAmount;
            if (finalAmount == 0) revert InvalidAmount();

            uint96 currentReserved = report.approvedAmount;
            if (finalAmount > currentReserved) {
                uint256 reserveDelta = uint256(finalAmount) - currentReserved;
                if (reserveDelta > availableEscrow()) revert InsufficientEscrow();
                totalReserved += uint96(reserveDelta);
            } else if (finalAmount < currentReserved) {
                uint96 unlocked = currentReserved - finalAmount;
                totalReserved -= unlocked;
            }

            report.approvedAmount = finalAmount;
            report.reviewedAt = uint64(block.timestamp);
            report.status = ReportStatus.Approved;

            emit ReportApproved(reportId, msg.sender, finalAmount);
            emit DisputeResolved(reportId, true, finalAmount);
            return;
        }

        if (report.approvedAmount > 0) {
            totalReserved -= report.approvedAmount;
            report.approvedAmount = 0;
        }
        report.reviewedAt = uint64(block.timestamp);
        report.status = ReportStatus.Rejected;

        emit ReportRejected(reportId, msg.sender, "Rejected by arbiter");
        emit DisputeResolved(reportId, false, 0);
    }

    function releaseFunds(uint256 reportId) external nonReentrant whenInitialized whenActive {
        Report storage report = reports[reportId];
        if (report.status != ReportStatus.Approved) revert InvalidState();
        if (report.paidOut) revert InvalidState();

        bool isPrivileged = msg.sender == organization || msg.sender == arbiter || hasRole(RELAYER_ROLE, msg.sender);
        if (!isPrivileged && msg.sender == report.researcher) {
            if (block.timestamp < uint256(report.reviewedAt) + autoReleaseWindow) revert AutoReleaseNotReady();
        } else if (!isPrivileged) {
            revert NotResearcher();
        }

        uint96 amount = report.approvedAmount;
        if (amount == 0) revert InvalidAmount();

        report.paidOut = true;
        report.status = ReportStatus.Paid;
        totalReserved -= amount;
        totalPaidOut += amount;

        (bool ok, ) = payable(report.researcher).call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit PayoutReleased(reportId, report.researcher, amount, msg.sender);
        emit BountyPaid(report.researcher, amount);
    }

    function closeBounty() external nonReentrant whenInitialized onlyOrg {
        if (bountyClosed) revert BountyClosedError();
        if (totalReserved > 0) revert PendingReservedPayouts();

        bountyClosed = true;
        uint256 refundable = availableEscrow();
        if (refundable > 0) {
            totalFunded -= uint96(refundable);
            (bool ok, ) = payable(organization).call{value: refundable}("");
            if (!ok) revert TransferFailed();
        }

        emit BountyClosed(organization, refundable);
    }

    // ---------------------------------------------------------------------
    // Legacy compatibility wrappers for older frontend calls
    // ---------------------------------------------------------------------
    function deposit() external payable whenInitialized whenActive onlyOrg {
        _fund(msg.value, msg.sender);
    }

    function approveAndPay(address payable researcher, uint96 amount) external nonReentrant whenInitialized whenActive onlyOrg {
        if (researcher == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (uint256(amount) > availableEscrow()) revert InsufficientEscrow();

        totalPaidOut += amount;
        (bool ok, ) = researcher.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit PayoutReleased(0, researcher, amount, msg.sender);
        emit BountyPaid(researcher, amount);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------
    function availableEscrow() public view returns (uint256) {
        return uint256(totalFunded) - uint256(totalPaidOut) - uint256(totalReserved);
    }

    function isActive() external view returns (bool) {
        return bountyInitialized && !bountyClosed;
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------
    function _fund(uint256 amount, address funder) internal {
        if (amount == 0) revert InvalidAmount();
        totalFunded += uint96(amount);
        emit Funded(funder, amount, totalFunded);
        emit BountyDeposited(funder, amount);
    }
}
