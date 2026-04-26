const { issueNonce, walletLogin } = require("../services/authService");

async function requestNonce(req, res) {
  const result = await issueNonce(req.body.walletAddress);
  res.json(result);
}

async function loginWithWallet(req, res) {
  const result = await walletLogin(req.body);
  res.json(result);
}

async function getMe(req, res) {
  res.json({
    walletAddress: req.auth.walletAddress,
    role: req.auth.role,
    user: req.auth.user,
  });
}

module.exports = {
  requestNonce,
  loginWithWallet,
  getMe,
};
