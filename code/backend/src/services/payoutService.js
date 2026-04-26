const { supabaseAdmin } = require("../db/supabaseAdmin");
const { releaseFundsOnChain } = require("../web3/contractClient");
const { socketHub } = require("../realtime/socketHub");

async function releasePayout(reportId) {
  const { data: report, error } = await supabaseAdmin.from("reports").select("*, bounties(*)").eq("id", reportId).single();
  if (error || !report) throw new Error("Report not found");
  if (!report.onchain_report_id) throw new Error("Missing on-chain report id");

  const receipt = await releaseFundsOnChain(report.bounties.contract_address, report.onchain_report_id);

  const payoutInsert = await supabaseAdmin
    .from("payouts")
    .insert({
      report_id: report.id,
      user_address: report.reporter_address,
      amount_eth: report.payout_amount_eth,
      tx_hash: receipt.hash,
      contract_address: report.bounties.contract_address,
      status: "released",
    })
    .select("*")
    .single();

  if (payoutInsert.error) throw payoutInsert.error;

  await supabaseAdmin
    .from("reports")
    .update({
      status: "paid",
      payout_tx_hash: receipt.hash,
    })
    .eq("id", report.id);

  await supabaseAdmin.from("notifications").insert({
    user_address: report.reporter_address,
    category: "payout_released",
    title: "Payout released",
    message: `Payout for report ${report.title || report.id} has been released.`,
    bounty_id: report.bounty_id,
    report_id: report.id,
  });

  socketHub.broadcast("payout.released", {
    payoutId: payoutInsert.data.id,
    reportId: report.id,
    userAddress: report.reporter_address,
  });

  return payoutInsert.data;
}

async function listUserPayouts(userAddress) {
  const { data, error } = await supabaseAdmin
    .from("payouts")
    .select("*")
    .eq("user_address", userAddress.toLowerCase())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

module.exports = {
  releasePayout,
  listUserPayouts,
};
