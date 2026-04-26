const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
const { env } = require("../config/env");
const { generateNonce } = require("../utils/crypto");
const { supabaseAdmin } = require("../db/supabaseAdmin");

function buildLoginMessage(walletAddress, nonce) {
  return [
    "Debug Wallet Login",
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Nonce: ${nonce}`,
    "Purpose: Authenticate to Debug API",
  ].join("\n");
}

async function issueNonce(walletAddress) {
  const nonce = generateNonce(12);
  const nonceExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { data: existing } = await supabaseAdmin.from("users").select("*").eq("wallet_address", walletAddress.toLowerCase()).single();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("users")
      .update({ auth_nonce: nonce, auth_nonce_expires_at: nonceExpiresAt })
      .eq("wallet_address", walletAddress.toLowerCase());
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin.from("users").insert({
      wallet_address: walletAddress.toLowerCase(),
      role: "researcher",
      auth_nonce: nonce,
      auth_nonce_expires_at: nonceExpiresAt,
    });
    if (error) throw error;
  }

  return {
    nonce,
    message: buildLoginMessage(walletAddress, nonce),
    expiresAt: nonceExpiresAt,
  };
}

async function walletLogin({ walletAddress, signature, nonce, role }) {
  const wallet = walletAddress.toLowerCase();
  const { data: user, error } = await supabaseAdmin.from("users").select("*").eq("wallet_address", wallet).single();
  if (error || !user) throw new Error("Unknown wallet. Request a nonce first.");

  if (!user.auth_nonce || user.auth_nonce !== nonce) {
    throw new Error("Nonce mismatch");
  }
  if (user.auth_nonce_expires_at && new Date(user.auth_nonce_expires_at).getTime() < Date.now()) {
    throw new Error("Nonce expired");
  }

  const message = buildLoginMessage(wallet, nonce);
  const signer = ethers.verifyMessage(message, signature).toLowerCase();
  if (signer !== wallet) {
    throw new Error("Invalid signature");
  }

  const freshNonce = generateNonce(12);
  await supabaseAdmin
    .from("users")
    .update({
      role: role || user.role || "researcher",
      auth_nonce: freshNonce,
      auth_nonce_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      last_login_at: new Date().toISOString(),
    })
    .eq("wallet_address", wallet);

  const token = jwt.sign(
    {
      walletAddress: wallet,
      role: role || user.role || "researcher",
    },
    env.jwtSecret,
    { expiresIn: env.jwtTtl }
  );

  const { data: refreshed } = await supabaseAdmin.from("users").select("*").eq("wallet_address", wallet).single();

  return {
    token,
    user: refreshed,
  };
}

module.exports = {
  issueNonce,
  walletLogin,
};
