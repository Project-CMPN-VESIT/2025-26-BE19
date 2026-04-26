const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth");
const { listNotificationsHandler } = require("../controllers/notificationController");

const router = express.Router();

router.get("/", requireAuth, asyncHandler(listNotificationsHandler));

module.exports = router;
