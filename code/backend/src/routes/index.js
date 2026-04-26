const express = require("express");
const authRoutes = require("./authRoutes");
const bountyRoutes = require("./bountyRoutes");
const reportRoutes = require("./reportRoutes");
const payoutRoutes = require("./payoutRoutes");
const notificationRoutes = require("./notificationRoutes");
const aiRoutes = require("./aiRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/bounties", bountyRoutes);
router.use("/reports", reportRoutes);
router.use("/payouts", payoutRoutes);
router.use("/notifications", notificationRoutes);

// Backward compatible AI endpoints
router.use("/ai", aiRoutes);

module.exports = router;
