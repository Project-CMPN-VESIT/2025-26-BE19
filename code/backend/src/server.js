const http = require("http");
const { createApp } = require("./app");
const { env } = require("./config/env");
const { logger } = require("./config/logger");
const { socketHub } = require("./realtime/socketHub");
const { startIndexer, stopIndexer } = require("./web3/indexerService");
const { startTriageWorker } = require("./ai/triageWorker");

const app = createApp();
const server = http.createServer(app);

socketHub.attach(server);
startIndexer();
startTriageWorker();

server.listen(env.port, () => {
  logger.info({ port: env.port }, "Debug backend started");
});

function shutdown(signal) {
  logger.info({ signal }, "Shutting down");
  stopIndexer();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
