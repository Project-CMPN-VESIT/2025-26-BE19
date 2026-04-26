const { analyzeReportPayload, detectDuplicateReport } = require("../ai/geminiService");

async function analyzeReportHandler(req, res) {
  const result = await analyzeReportPayload(req.body);
  res.json(result);
}

async function duplicateCheckHandler(req, res) {
  const result = await detectDuplicateReport(req.body.currentReport || {}, req.body.existingReports || []);
  res.json({
    isDuplicate: Boolean(result.duplicate_flag),
    similarityScore: Number(result.similarity || 0),
    reasoning: result.reason || "",
    duplicate_flag: Boolean(result.duplicate_flag),
    similarity: Number(result.similarity || 0),
    reason: result.reason || "",
  });
}

module.exports = {
  analyzeReportHandler,
  duplicateCheckHandler,
};
