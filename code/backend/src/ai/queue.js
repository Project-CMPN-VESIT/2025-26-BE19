const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const { env } = require("../config/env");
const { logger } = require("../config/logger");

const queueName = "debug-ai-triage";

let queue = null;
let redisConnection = null;

if (env.redisUrl) {
  redisConnection = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
  });
  queue = new Queue(queueName, { connection: redisConnection });
}

function isQueueEnabled() {
  return Boolean(queue);
}

async function enqueueTriageJob(data) {
  if (!queue) return null;
  return queue.add("triage-report", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1500,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  });
}

function startWorker(processor) {
  if (!redisConnection) {
    logger.info("Redis not configured; AI queue worker disabled");
    return null;
  }
  const worker = new Worker(queueName, processor, { connection: redisConnection });
  worker.on("failed", (job, error) => logger.error({ jobId: job?.id, error: error.message }, "AI worker job failed"));
  worker.on("completed", (job) => logger.debug({ jobId: job.id }, "AI worker job completed"));
  return worker;
}

module.exports = {
  isQueueEnabled,
  enqueueTriageJob,
  startWorker,
};
