const { z } = require("zod");

const walletAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address");

const authNonceSchema = z.object({
  walletAddress,
});

const walletLoginSchema = z.object({
  walletAddress,
  signature: z.string().min(10),
  nonce: z.string().min(8),
  role: z.enum(["researcher", "organization"]).optional(),
});

const createBountySchema = z.object({
  title: z.string().min(3),
  metadataUri: z.string().min(3),
  arbiter: walletAddress.optional(),
  autoReleaseWindow: z.number().int().positive().optional(),
  disputeWindow: z.number().int().positive().optional(),
  initialFundingEth: z.string().optional(),
  reward: z.number().nonnegative().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
});

const fundBountySchema = z.object({
  amountEth: z.string().min(1),
});

const createReportSchema = z.object({
  bountyId: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().min(3),
  steps: z.string().optional(),
  poc: z.string().optional(),
  impact: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

const triageReportSchema = z.object({
  reportId: z.string().uuid(),
});

const approveReportSchema = z.object({
  payoutEth: z.string().min(1),
});

const rejectReportSchema = z.object({
  reason: z.string().min(3),
});

const releasePayoutSchema = z.object({
  reportId: z.string().uuid(),
});

module.exports = {
  authNonceSchema,
  walletLoginSchema,
  createBountySchema,
  fundBountySchema,
  createReportSchema,
  triageReportSchema,
  approveReportSchema,
  rejectReportSchema,
  releasePayoutSchema,
};
