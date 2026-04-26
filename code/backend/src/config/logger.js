const pino = require("pino");
const { env } = require("./env");

const logger = pino({
  level: env.nodeEnv === "production" ? "info" : "debug",
});

module.exports = { logger };
