const {
  createReport,
  listReportsByBounty,
  runManualTriage,
  approveReport,
  rejectReport,
} = require("../services/reportService");

async function createReportHandler(req, res) {
  const report = await createReport({
    reporterWallet: req.auth.walletAddress,
    payload: req.body,
  });
  res.status(201).json(report);
}

async function listReportsHandler(req, res) {
  const reports = await listReportsByBounty(req.params.bountyId);
  res.json(reports);
}

async function triageReportHandler(req, res) {
  const report = await runManualTriage(req.params.id);
  res.json(report);
}

async function approveReportHandler(req, res) {
  const report = await approveReport({
    reportId: req.params.id,
    payoutEth: req.body.payoutEth,
  });
  res.json(report);
}

async function rejectReportHandler(req, res) {
  const report = await rejectReport({
    reportId: req.params.id,
    reason: req.body.reason,
  });
  res.json(report);
}

module.exports = {
  createReportHandler,
  listReportsHandler,
  triageReportHandler,
  approveReportHandler,
  rejectReportHandler,
};
