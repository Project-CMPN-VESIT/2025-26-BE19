const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3001),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  jwtSecret: process.env.JWT_SECRET || "debug-dev-secret",
  jwtTtl: process.env.JWT_TTL || "8h",
  rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
  wsRpcUrl: process.env.WS_RPC_URL || "",
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || "",
  bountyEscrowAddress: process.env.BOUNTY_ESCROW_ADDRESS || "",
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co",
  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "placeholder-key",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  redisUrl: process.env.REDIS_URL || "",
  indexerConfirmations: Number(process.env.INDEXER_CONFIRMATIONS || 3),
  enableIndexer: (process.env.ENABLE_INDEXER || "true").toLowerCase() === "true",
};

if (env.supabaseUrl.includes("placeholder") || env.supabaseServiceRoleKey === "placeholder-key") {
  // eslint-disable-next-line no-console
  console.warn("[env] Supabase credentials are missing. API/database actions will fail until configured.");
}

module.exports = { env };
