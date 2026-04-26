const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { supabaseAdmin } = require("../db/supabaseAdmin");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const { data, error } = await supabaseAdmin.from("users").select("*").eq("wallet_address", payload.walletAddress).single();
    if (error || !data) return res.status(401).json({ error: "Invalid user context" });
    req.auth = {
      walletAddress: payload.walletAddress,
      role: payload.role,
      user: data,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth || !allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
