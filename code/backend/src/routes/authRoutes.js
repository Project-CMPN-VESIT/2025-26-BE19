const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { validate } = require("../middlewares/validate");
const { requireAuth } = require("../middlewares/auth");
const { authLimiter } = require("../middlewares/rateLimit");
const { authNonceSchema, walletLoginSchema } = require("../validators/schemas");
const { requestNonce, loginWithWallet, getMe } = require("../controllers/authController");

const router = express.Router();

router.post("/nonce", authLimiter, validate(authNonceSchema), asyncHandler(requestNonce));
router.post("/wallet-login", authLimiter, validate(walletLoginSchema), asyncHandler(loginWithWallet));
router.get("/me", requireAuth, asyncHandler(getMe));

module.exports = router;
