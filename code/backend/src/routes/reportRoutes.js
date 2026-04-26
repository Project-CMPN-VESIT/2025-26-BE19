const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const {
  createReportSchema,
  approveReportSchema,
  rejectReportSchema,
} = require("../validators/schemas");
const {
  createReportHandler,
  listReportsHandler,
  triageReportHandler,
  approveReportHandler,
  rejectReportHandler,
} = require("../controllers/reportController");

const router = express.Router();

router.post("/", requireAuth, requireRole("researcher"), validate(createReportSchema), asyncHandler(createReportHandler));
router.get("/:bountyId", requireAuth, asyncHandler(listReportsHandler));
router.post("/:id/triage", requireAuth, requireRole("organization"), asyncHandler(triageReportHandler));
router.post("/:id/approve", requireAuth, requireRole("organization"), validate(approveReportSchema), asyncHandler(approveReportHandler));
router.post("/:id/reject", requireAuth, requireRole("organization"), validate(rejectReportSchema), asyncHandler(rejectReportHandler));

module.exports = router;
