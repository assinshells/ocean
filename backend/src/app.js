import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import stubRoutes from "./routes/stubRoutes.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import requestIdMiddleware from "./middlewares/requestId.js";
import httpLogger from "./middlewares/httpLogger.js";
import env from "./config/env.js";
import logger from "./config/logger.js";

const app = express();

// Request ID для трейсинга
app.use(requestIdMiddleware);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", env.CLIENT_URL],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Compression
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
  })
);

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [env.CLIENT_URL];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn("CORS blocked request", { origin });
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID"],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// HTTP Request Logging
app.use(httpLogger);

// Trust proxy
app.set("trust proxy", 1);

// Disable X-Powered-By header
app.disable("x-powered-by");

// Health check endpoint
app.get("/health", (req, res) => {
  const healthcheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    memory: {
      heapUsed:
        Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      heapTotal:
        Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      external:
        Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100,
      rss: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100,
    },
  };

  req.logger.debug("Health check requested", healthcheck);
  res.json(healthcheck);
});

// Ready check
app.get("/ready", (req, res) => {
  res.status(200).json({ status: "ready" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api", stubRoutes); // Временные заглушки

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

export default app;
