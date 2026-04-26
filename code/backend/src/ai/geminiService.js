const { GoogleGenerativeAI } = require("@google/generative-ai");
const { env } = require("../config/env");
const { logger } = require("../config/logger");

const client = env.geminiApiKey ? new GoogleGenerativeAI(env.geminiApiKey) : null;

function extractJsonObject(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

async function retryableModelCall(prompt, fallback, maxAttempts = 3) {
  if (!client) {
    return fallback;
  }

  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return extractJsonObject(text);
    } catch (error) {
      attempt += 1;
      if (attempt >= maxAttempts) {
        logger.error({ err: error.message }, "Gemini call failed; using fallback");
        return fallback;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 600));
    }
  }
  return fallback;
}

async function analyzeReportPayload(payload) {
  const prompt = `
You are a senior bug bounty triage analyst.
Analyze the report below and return strict JSON with fields:
{
  "severity": "low|medium|high|critical",
  "score": number,
  "summary": string,
  "recommendation": string
}

Report title: ${payload.title}
Description: ${payload.description}
Steps: ${payload.steps || ""}
PoC: ${payload.poc || ""}
Impact: ${payload.impact || ""}
`;

  return retryableModelCall(
    prompt,
    {
      severity: "medium",
      score: 0.5,
      summary: "AI fallback: triage unavailable. Manual review required.",
      recommendation: "Run manual triage.",
    },
    3
  );
}

async function detectDuplicateReport(current, existingReports) {
  const prompt = `
Detect whether the current report is a likely duplicate of existing entries.
Return strict JSON:
{
  "duplicate_flag": boolean,
  "similarity": number,
  "reason": string
}
Current: ${JSON.stringify(current)}
Existing: ${JSON.stringify(
    (existingReports || []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
    }))
  )}
`;

  return retryableModelCall(
    prompt,
    {
      duplicate_flag: false,
      similarity: 0,
      reason: "AI duplicate detector unavailable; defaulting to no duplicate.",
    },
    2
  );
}

module.exports = {
  analyzeReportPayload,
  detectDuplicateReport,
};
