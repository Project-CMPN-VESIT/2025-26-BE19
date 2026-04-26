const { env } = require("../config/env");
const { logger } = require("../config/logger");
const { supabaseAdmin } = require("../db/supabaseAdmin");
const { provider, iface } = require("./contractClient");
const { handleEventLog } = require("./eventHandlers");

const INDEXER_KEY = "bounty_escrow";
const BLOCK_BATCH_SIZE = 500;
const POLL_INTERVAL_MS = 8000;
const MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

let timer = null;
let busy = false;
let failureCount = 0;
let nextRunAfter = 0;
let lastFailureFingerprint = "";
let suspendedUntil = 0;

async function getTrackedAddresses() {
  const { data, error } = await supabaseAdmin.from("bounties").select("contract_address").not("contract_address", "is", null);
  if (error) throw error;
  const addresses = new Set((data || []).map((item) => item.contract_address?.toLowerCase()).filter(Boolean));
  if (env.bountyEscrowAddress) addresses.add(env.bountyEscrowAddress.toLowerCase());
  return Array.from(addresses);
}

async function getIndexerState() {
  const { data, error } = await supabaseAdmin.from("indexer_state").select("*").eq("key", INDEXER_KEY).single();
  if (error && error.code !== "PGRST116") throw error;
  if (data) return data;

  const latest = await provider.getBlockNumber();
  const seed = { key: INDEXER_KEY, last_processed_block: latest - 1, updated_at: new Date().toISOString() };
  await supabaseAdmin.from("indexer_state").upsert(seed, { onConflict: "key" });
  return seed;
}

async function setIndexerState(lastProcessedBlock) {
  await supabaseAdmin.from("indexer_state").upsert(
    {
      key: INDEXER_KEY,
      last_processed_block: lastProcessedBlock,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}

async function parseAndHandleLogs(logs) {
  for (const log of logs) {
    try {
      const parsed = iface.parseLog(log);
      if (!parsed) continue;
      await handleEventLog(parsed, log);
    } catch (error) {
      logger.warn({ txHash: log.transactionHash, reason: error.message }, "Failed to parse or persist log");
    }
  }
}

async function fetchLogsWithRetry(filter, retries = MAX_RETRIES) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await provider.getLogs(filter);
    } catch (error) {
      attempt += 1;
      if (attempt >= retries) throw error;
      logger.warn({ attempt, error: error.message }, "Retrying log fetch after provider error");
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  return [];
}

async function syncOnce() {
  if (busy) return;
  if (Date.now() < suspendedUntil) return;
  if (Date.now() < nextRunAfter) return;
  busy = true;
  try {
    const addresses = await getTrackedAddresses();
    if (addresses.length === 0) return;

    const state = await getIndexerState();
    const latest = await provider.getBlockNumber();
    const safeBlock = Math.max(0, latest - env.indexerConfirmations);
    let cursor = Number(state.last_processed_block || 0) + 1;

    if (cursor > safeBlock) return;

    while (cursor <= safeBlock) {
      const toBlock = Math.min(cursor + BLOCK_BATCH_SIZE - 1, safeBlock);
      const logs = await fetchLogsWithRetry({
        address: addresses,
        fromBlock: cursor,
        toBlock,
      });
      await parseAndHandleLogs(logs);
      await setIndexerState(toBlock);
      cursor = toBlock + 1;
    }
    failureCount = 0;
    nextRunAfter = 0;
    lastFailureFingerprint = "";
  } catch (error) {
    failureCount += 1;
    const backoffMs = Math.min(MAX_BACKOFF_MS, POLL_INTERVAL_MS * (2 ** Math.min(failureCount, 8)));
    nextRunAfter = Date.now() + backoffMs;
    const fingerprint = `${error.name}:${error.message}`;
    const shouldLog = fingerprint !== lastFailureFingerprint || failureCount === 1 || failureCount % 5 === 0;
    if (shouldLog) {
      logger.error(
        {
          err: error.message,
          rpcUrl: env.rpcUrl,
          failureCount,
          nextRetryInMs: backoffMs,
        },
        "Indexer sync failed (backoff active)"
      );
      lastFailureFingerprint = fingerprint;
    }

    // If upstream network remains unavailable, pause noisy polling for a longer window.
    const isNetworkFetchError = typeof error.message === "string" && error.message.toLowerCase().includes("fetch failed");
    if (isNetworkFetchError && failureCount >= 6) {
      suspendedUntil = Date.now() + 10 * 60 * 1000;
      logger.warn(
        {
          failureCount,
          suspendedForMs: 10 * 60 * 1000,
        },
        "Indexer temporarily suspended due persistent upstream network failures"
      );
    }
  } finally {
    busy = false;
  }
}

function startIndexer() {
  if (!env.enableIndexer) {
    logger.info("Indexer disabled by env");
    return;
  }
  if (timer) return;
  logger.info({ rpcUrl: env.rpcUrl, pollMs: POLL_INTERVAL_MS }, "Starting blockchain indexer");
  timer = setInterval(syncOnce, POLL_INTERVAL_MS);
  syncOnce().catch((error) => logger.error({ err: error.message }, "Initial indexer sync failed"));
}

function stopIndexer() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  startIndexer,
  stopIndexer,
  syncOnce,
};
