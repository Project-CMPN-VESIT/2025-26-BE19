const { ethers } = require("ethers");
const { supabaseAdmin } = require("../db/supabaseAdmin");
const { enqueueTriageJob, isQueueEnabled } = require("../ai/queue");
const { runInlineTriage } = require("../ai/triageWorker");
const {
  submitReportHashOnChain,
  approveReportOnChain,
  rejectReportOnChain,
} = require("../web3/contractClient");
const { socketHub } = require("../realtime/socketHub");

function buildReportHash(payload) {
  const canonical = JSON.stringify({
    bountyId: payload.bountyId,
    title: payload.title,
    description: payload.description,
    steps: payload.steps || "",
    poc: payload.poc || "",
    impact: payload.impact || "",
  });
  return ethers.id(canonical);
}

function toWei(value) {
  return ethers.parseEther((value || "0").toString());
}

async function createReport({ reporterWallet, payload }) {
  const { data: bounty, error: bountyError } = await supabaseAdmin.from("bounties").select("*").eq("id", payload.bountyId).single();
  if (bountyError || !bounty) throw new Error("Bounty not found");

  const reportHash = buildReportHash(payload);
  const inserted = await supabaseAdmin
    .from("reports")
    .insert({
      bounty_id: payload.bountyId,
      reporter_address: reporterWallet.toLowerCase(),
      title: payload.title,
      description: payload.description,
      steps: payload.steps || null,
      poc: payload.poc || null,
      impact: payload.impact || null,
      report_hash: reportHash,
      status: "submitted",
      triage_status: "queued",
      contract_address: bounty.contract_address,
      attachments: payload.attachments || [],
    })
    .select("*")
    .single();

  if (inserted.error) throw inserted.error;
  const report = inserted.data;

  const onChain = await submitReportHashOnChain(bounty.contract_address, reporterWallet.toLowerCase(), reportHash);

  await supabaseAdmin
    .from("reports")
    .update({
      onchain_report_id: onChain.onChainReportId,
      onchain_tx_hash: onChain.receipt.hash,
    })
    .eq("id", report.id);

  await supabaseAdmin.from("notifications").insert({
    user_address: bounty.org_address,
    category: "new_report",
    title: "New report submitted",
    message: `Report submitted for bounty ${bounty.title}`,
    bounty_id: bounty.id,
    report_id: report.id,
  });

  socketHub.broadcast("report.created", {
    bountyId: bounty.id,
    reportId: report.id,
    reporterAddress: reporterWallet.toLowerCase(),
  });

  if (isQueueEnabled()) {
    await enqueueTriageJob({ reportId: report.id });
  } else {
    await runInlineTriage(report.id);
  }

  const { data: refreshed, error: refreshError } = await supabaseAdmin.from("reports").select("*").eq("id", report.id).single();
  if (refreshError) throw refreshError;
  return refreshed;
}

async function listReportsByBounty(bountyId) {
  const { data, error } = await supabaseAdmin.from("reports").select("*").eq("bounty_id", bountyId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function runManualTriage(reportId) {
  await runInlineTriage(reportId);
  const { data, error } = await supabaseAdmin.from("reports").select("*").eq("id", reportId).single();
  if (error) throw error;
  return data;
}

async function approveReport({ reportId, payoutEth }) {
  const { data: report, error } = await supabaseAdmin.from("reports").select("*, bounties(*)").eq("id", reportId).single();
  if (error || !report) throw new Error("Report not found");
  if (!report.onchain_report_id) throw new Error("Missing on-chain report id");

  const bounty = report.bounties;
  const receipt = await approveReportOnChain(bounty.contract_address, report.onchain_report_id, toWei(payoutEth));

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("reports")
    .update({
      status: "approved",
      payout_amount_eth: Number(payoutEth),
      approval_tx_hash: receipt.hash,
    })
    .eq("id", report.id)
    .select("*")
    .single();
  if (updateError) throw updateError;

  await supabaseAdmin.from("notifications").insert({
    user_address: report.reporter_address,
    category: "report_approved",
    title: "Report approved",
    message: `Your report on ${bounty.title} has been approved.`,
    bounty_id: bounty.id,
    report_id: report.id,
  });

  socketHub.broadcast("report.approved", { reportId: report.id, bountyId: bounty.id });
  return updated;
}

async function rejectReport({ reportId, reason }) {
  const { data: report, error } = await supabaseAdmin.from("reports").select("*, bounties(*)").eq("id", reportId).single();
  if (error || !report) throw new Error("Report not found");
  if (!report.onchain_report_id) throw new Error("Missing on-chain report id");

  const bounty = report.bounties;
  const receipt = await rejectReportOnChain(bounty.contract_address, report.onchain_report_id, reason);

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("reports")
    .update({
      status: "rejected",
      rejection_reason: reason,
      rejection_tx_hash: receipt.hash,
    })
    .eq("id", report.id)
    .select("*")
    .single();
  if (updateError) throw updateError;

  await supabaseAdmin.from("notifications").insert({
    user_address: report.reporter_address,
    category: "report_rejected",
    title: "Report rejected",
    message: `Your report on ${bounty.title} was rejected.`,
    bounty_id: bounty.id,
    report_id: report.id,
  });

  socketHub.broadcast("report.rejected", { reportId: report.id, bountyId: bounty.id });
  return updated;
}

module.exports = {
  createReport,
  listReportsByBounty,
  runManualTriage,
  approveReport,
  rejectReport,
};
