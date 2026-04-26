const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { createBountySchema, fundBountySchema } = require("../validators/schemas");
const {
  createBountyHandler,
  listBountiesHandler,
  getBountyHandler,
  fundBountyHandler,
  closeBountyHandler,
} = require("../controllers/bountyController");

const router = express.Router();

router.get("/", asyncHandler(listBountiesHandler));
router.get("/:id", asyncHandler(getBountyHandler));
router.post("/", requireAuth, requireRole("organization"), validate(createBountySchema), asyncHandler(createBountyHandler));
router.post("/:id/fund", requireAuth, requireRole("organization"), validate(fundBountySchema), asyncHandler(fundBountyHandler));
router.post("/:id/close", requireAuth, requireRole("organization"), asyncHandler(closeBountyHandler));

module.exports = router;
