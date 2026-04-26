const { supabaseAdmin } = require("../db/supabaseAdmin");
const { startWorker } = require("./queue");
const { analyzeReportPayload, detectDuplicateReport } = require("./geminiService");
const { logger } = require("../config/logger");

async function runTriageForReport(reportId) {
  const { data: report, error } = await supabaseAdmin.from("reports").select("*").eq("id", reportId).single();
  if (error || !report) {
    throw new Error("Report not found for triage worker");
  }

  const { data: siblingReports } = await supabaseAdmin
    .from("reports")
    .select("id,title,description")
    .eq("bounty_id", report.bounty_id)
    .neq("id", report.id);

  const [analysis, duplicate] = await Promise.all([
    analyzeReportPayload(report),
    detectDuplicateReport(report, siblingReports || []),
  ]);

  const { error: updateError } = await supabaseAdmin
    .from("reports")
    .update({
      ai_severity: analysis.severity,
      ai_score: analysis.score,
      ai_summary: analysis.summary,
      ai_recommendation: analysis.recommendation,
      duplicate_flag: duplicate.duplicate_flag,
      duplicate_score: duplicate.similarity,
      duplicate_reason: duplicate.reason,
      triage_status: "completed",
      triaged_at: new Date().toISOString(),
    })
    .eq("id", report.id);

  if (updateError) throw updateError;
  return { analysis, duplicate };
}

function startTriageWorker() {
  return startWorker(async (job) => {
    const { reportId } = job.data;
    await runTriageForReport(reportId);
  });
}

async function runInlineTriage(reportId) {
  try {
    return await runTriageForReport(reportId);
  } catch (error) {
    logger.error({ err: error.message, reportId }, "Inline triage failed");
    await supabaseAdmin
      .from("reports")
      .update({
        triage_status: "failed",
        ai_summary: "AI triage failed; manual review required.",
      })
      .eq("id", reportId);
    throw error;
  }
}

module.exports = {
  startTriageWorker,
  runInlineTriage,
};
