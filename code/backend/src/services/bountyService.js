const { ethers } = require("ethers");
const { supabaseAdmin } = require("../db/supabaseAdmin");
const {
  deployEscrowContract,
  createBountyOnChain,
  fundBountyOnChain,
  closeBountyOnChain,
} = require("../web3/contractClient");

function toWei(ethAmount) {
  return ethers.parseEther((ethAmount || "0").toString());
}

async function createBounty({ creatorWallet, payload }) {
  const contractAddress = await deployEscrowContract();
  const initialFundingWei = toWei(payload.initialFundingEth || "0");
  const receipt = await createBountyOnChain(contractAddress, {
    organization: creatorWallet,
    metadataUri: payload.metadataUri,
    arbiter: payload.arbiter,
    autoReleaseWindow: payload.autoReleaseWindow,
    disputeWindow: payload.disputeWindow,
    initialFundingWei,
  });

  const { data, error } = await supabaseAdmin
    .from("bounties")
    .insert({
      org_address: creatorWallet.toLowerCase(),
      title: payload.title,
      metadata_uri: payload.metadataUri,
      reward: Number(payload.reward || payload.initialFundingEth || 0),
      severity: payload.severity || "medium",
      status: "active",
      contract_address: contractAddress.toLowerCase(),
      onchain_id: 1,
      tx_hash: receipt.hash,
      created_by: creatorWallet.toLowerCase(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function listBounties(filters) {
  let query = supabaseAdmin.from("bounties").select("*").order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.severity) query = query.eq("severity", filters.severity);
  if (filters.minReward) query = query.gte("reward", Number(filters.minReward));
  if (filters.maxReward) query = query.lte("reward", Number(filters.maxReward));

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getBountyById(id) {
  const { data, error } = await supabaseAdmin.from("bounties").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function fundBounty({ id, amountEth }) {
  const bounty = await getBountyById(id);
  const receipt = await fundBountyOnChain(bounty.contract_address, toWei(amountEth));

  const updatedReward = Number(bounty.reward || 0) + Number(amountEth);
  const { data, error } = await supabaseAdmin
    .from("bounties")
    .update({
      reward: updatedReward,
      last_funded_at: new Date().toISOString(),
      last_funding_tx: receipt.hash,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function closeBounty(id) {
  const bounty = await getBountyById(id);
  const receipt = await closeBountyOnChain(bounty.contract_address);
  const { data, error } = await supabaseAdmin
    .from("bounties")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      close_tx_hash: receipt.hash,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  createBounty,
  listBounties,
  getBountyById,
  fundBounty,
  closeBounty,
};
