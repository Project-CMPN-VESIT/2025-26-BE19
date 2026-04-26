const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { releasePayoutSchema } = require("../validators/schemas");
const { releasePayoutHandler, getUserPayoutsHandler } = require("../controllers/payoutController");

const router = express.Router();

router.post("/release", requireAuth, requireRole("organization"), validate(releasePayoutSchema), asyncHandler(releasePayoutHandler));
router.get("/:userAddress", requireAuth, asyncHandler(getUserPayoutsHandler));

module.exports = router;
