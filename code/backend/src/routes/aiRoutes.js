const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { analyzeReportHandler, duplicateCheckHandler } = require("../controllers/aiController");

const router = express.Router();

router.post("/analyze-report", asyncHandler(analyzeReportHandler));
router.post("/check-duplicate", asyncHandler(duplicateCheckHandler));

module.exports = router;
