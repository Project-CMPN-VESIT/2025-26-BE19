const { releasePayout, listUserPayouts } = require("../services/payoutService");

async function releasePayoutHandler(req, res) {
  const payout = await releasePayout(req.body.reportId);
  res.status(201).json(payout);
}

async function getUserPayoutsHandler(req, res) {
  const payouts = await listUserPayouts(req.params.userAddress || req.auth.walletAddress);
  res.json(payouts);
}

module.exports = {
  releasePayoutHandler,
  getUserPayoutsHandler,
};
