const { ethers } = require("ethers");
const { env } = require("../config/env");
const { getBountyEscrowArtifact } = require("./artifact");

const provider = new ethers.JsonRpcProvider(env.rpcUrl);
const artifact = getBountyEscrowArtifact();
const abi = artifact.abi;
const bytecode = artifact.bytecode;
const iface = new ethers.Interface(abi);

function getRelayerSigner() {
  if (!env.relayerPrivateKey) {
    throw new Error("RELAYER_PRIVATE_KEY is required for on-chain write actions");
  }
  return new ethers.Wallet(env.relayerPrivateKey, provider);
}

function getContract(address, signerOrProvider = provider) {
  return new ethers.Contract(address, abi, signerOrProvider);
}

async function deployEscrowContract() {
  const signer = getRelayerSigner();
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy(signer.address);
  await contract.waitForDeployment();
  return await contract.getAddress();
}

async function createBountyOnChain(contractAddress, payload) {
  const signer = getRelayerSigner();
  const contract = getContract(contractAddress, signer);
  const tx = await contract.createBounty(
    payload.organization,
    payload.metadataUri,
    payload.arbiter || ethers.ZeroAddress,
    BigInt(payload.autoReleaseWindow || 2 * 24 * 60 * 60),
    BigInt(payload.disputeWindow || 3 * 24 * 60 * 60),
    {
      value: BigInt(payload.initialFundingWei || 0),
    }
  );
  return tx.wait();
}

async function fundBountyOnChain(contractAddress, amountWei) {
  const signer = getRelayerSigner();
  const contract = getContract(contractAddress, signer);
  const tx = await contract.fundBounty({ value: BigInt(amountWei) });
  return tx.wait();
}

async function submitReportHashOnChain(contractAddress, researcher, reportHash) {
  const signer = getRelayerSigner();
  const contract = getContract(contractAddress, signer);
  const tx = await contract.submitReportHash(researcher, reportHash);
  const receipt = await tx.wait();
  const parsedEvent = receipt.logs
    .map((log) => {
      try {
        return iface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((log) => log && log.name === "ReportSubmitted");

  return {
    receipt,
    onChainReportId: parsedEvent ? Number(parsedEvent.args.reportId) : null,
  };
}

async function approveReportOnChain(contractAddress, reportId, payoutWei) {
  const signer = getRelayerSigner();
  const contract = getContract(contractAddress, signer);
  const tx = await contract.approveReport(BigInt(reportId), BigInt(payoutWei));
  return tx.wait();
}

async function rejectReportOnChain(contractAddress, reportId, reason) {
  const signer = getRelayerSigner();
  const contract = getContract(contractAddress, signer);
  const tx = await contract.rejectReport(BigInt(reportId), reason);
  return tx.wait();
}

async function releaseFundsOnChain(contractAddress, reportId) {
  const signer = getRelayerSigner();
  const contract = getContract(contractAddress, signer);
  const tx = await contract.releaseFunds(BigInt(reportId));
  return tx.wait();
}

async function closeBountyOnChain(contractAddress) {
  const signer = getRelayerSigner();
  const contract = getContract(contractAddress, signer);
  const tx = await contract.closeBounty();
  return tx.wait();
}

module.exports = {
  provider,
  abi,
  iface,
  getContract,
  deployEscrowContract,
  createBountyOnChain,
  fundBountyOnChain,
  submitReportHashOnChain,
  approveReportOnChain,
  rejectReportOnChain,
  releaseFundsOnChain,
  closeBountyOnChain,
};
