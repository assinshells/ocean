import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import initializeSocket from "./sockets/chat.js";
import env from "./config/env.js";
import logger from "./config/logger.js";
import {
  handleUnhandledRejection,
  handleUncaughtException,
} from "./middlewares/errorHandler.js";

// Обработка необработанных ошибок
handleUncaughtException();
handleUnhandledRejection();

const PORT = env.PORT || 5000;
const server = http.createServer(app);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

// Database connection
await connectDB();

// Initialize Socket.IO
initializeSocket(io);

// Start server
const startServer = () => {
  server.listen(PORT, () => {
    logger.info("Server started", {
      port: PORT,
      environment: env.NODE_ENV,
      nodeVersion: process.version,
    });
  });
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info("HTTP server closed");

    try {
      // Close Socket.IO connections
      io.close(() => {
        logger.info("Socket.IO closed");
      });

      // Close database connection
      const mongoose = (await import("mongoose")).default;
      await mongoose.connection.close();
      logger.info("Database connection closed");

      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown", { error: error.message });
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
};

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start the server
startServer();

export { io };
