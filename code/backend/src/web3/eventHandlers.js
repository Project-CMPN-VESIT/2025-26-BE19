const { supabaseAdmin } = require("../db/supabaseAdmin");
const { logger } = require("../config/logger");

async function upsertTransactionRow(payload) {
  const { error } = await supabaseAdmin.from("transactions").upsert(payload, {
    onConflict: "tx_hash,log_index",
  });
  if (error) throw error;
}

async function handleEventLog(parsed, rawLog) {
  const txRow = {
    tx_hash: rawLog.transactionHash,
    log_index: rawLog.index,
    block_number: rawLog.blockNumber,
    event_name: parsed.name,
    contract_address: rawLog.address.toLowerCase(),
    payload: parsed.args,
  };

  await upsertTransactionRow(txRow);

  switch (parsed.name) {
    case "BountyCreated": {
      const { organization, metadataURI } = parsed.args;
      await supabaseAdmin
        .from("bounties")
        .update({
          status: "active",
          onchain_status: "created",
          org_address: organization.toLowerCase(),
          metadata_uri: metadataURI,
        })
        .eq("contract_address", rawLog.address.toLowerCase());
      break;
    }
    case "Funded": {
      const { totalFunded } = parsed.args;
      await supabaseAdmin
        .from("bounties")
        .update({
          reward: Number(totalFunded),
          onchain_status: "funded",
        })
        .eq("contract_address", rawLog.address.toLowerCase());
      break;
    }
    case "ReportSubmitted": {
      const { reportId, researcher, reportHash } = parsed.args;
      await supabaseAdmin
        .from("reports")
        .update({
          onchain_report_id: Number(reportId),
          report_hash: reportHash,
          reporter_address: researcher.toLowerCase(),
          onchain_status: "submitted",
        })
        .eq("contract_address", rawLog.address.toLowerCase())
        .is("onchain_report_id", null)
        .limit(1);
      break;
    }
    case "ReportApproved": {
      const { reportId, payoutAmount } = parsed.args;
      await supabaseAdmin
        .from("reports")
        .update({
          status: "approved",
          payout_amount_wei: payoutAmount.toString(),
          onchain_status: "approved",
        })
        .eq("contract_address", rawLog.address.toLowerCase())
        .eq("onchain_report_id", Number(reportId));
      break;
    }
    case "PayoutReleased": {
      const { reportId, researcher, amount } = parsed.args;
      await supabaseAdmin.from("payouts").upsert(
        {
          report_onchain_id: Number(reportId),
          recipient_address: researcher.toLowerCase(),
          amount_wei: amount.toString(),
          tx_hash: rawLog.transactionHash,
          contract_address: rawLog.address.toLowerCase(),
        },
        { onConflict: "tx_hash" }
      );
      await supabaseAdmin
        .from("reports")
        .update({
          status: "paid",
          onchain_status: "paid",
        })
        .eq("contract_address", rawLog.address.toLowerCase())
        .eq("onchain_report_id", Number(reportId));
      break;
    }
    case "BountyClosed": {
      await supabaseAdmin
        .from("bounties")
        .update({
          status: "closed",
          onchain_status: "closed",
        })
        .eq("contract_address", rawLog.address.toLowerCase());
      break;
    }
    default:
      logger.debug({ event: parsed.name }, "Unhandled contract event (recorded in transactions only)");
  }
}

module.exports = {
  handleEventLog,
};
