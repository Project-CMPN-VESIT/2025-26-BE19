const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const { env } = require("./config/env");
const { logger } = require("./config/logger");
const { apiLimiter } = require("./middlewares/rateLimit");
const { requireAuth } = require("./middlewares/auth");
const { getMe } = require("./controllers/authController");
const { asyncHandler } = require("./utils/asyncHandler");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "2mb" }));
  app.use(pinoHttp({ logger }));
  app.use(apiLimiter);

  app.get("/", (req, res) => {
    res.json({
      service: "Debug Backend",
      status: "ok",
      version: "2.0.0",
    });
  });

  app.use("/api", routes);
  app.get("/api/me", requireAuth, asyncHandler(getMe));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
