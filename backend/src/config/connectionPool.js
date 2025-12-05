// backend/src/config/connectionPool.js
import mongoose from "mongoose";
import logger from "./logger.js";

class ConnectionPoolManager {
  constructor() {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      errors: 0,
    };

    this.setupMonitoring();
  }

  setupMonitoring() {
    // Мониторинг событий пула соединений
    if (mongoose.connection.client) {
      mongoose.connection.client.on("connectionPoolCreated", (event) => {
        logger.info("Connection pool created", {
          maxPoolSize: event.options.maxPoolSize,
          minPoolSize: event.options.minPoolSize,
        });
      });

      mongoose.connection.client.on("connectionCreated", (event) => {
        this.metrics.totalConnections++;
        this.metrics.activeConnections++;
        logger.debug("New connection created", {
          connectionId: event.connectionId,
          total: this.metrics.totalConnections,
        });
      });

      mongoose.connection.client.on("connectionReady", (event) => {
        logger.debug("Connection ready", {
          connectionId: event.connectionId,
        });
      });

      mongoose.connection.client.on("connectionClosed", (event) => {
        this.metrics.activeConnections--;
        logger.debug("Connection closed", {
          connectionId: event.connectionId,
          reason: event.reason,
        });
      });

      mongoose.connection.client.on("connectionCheckOutStarted", (event) => {
        logger.debug("Connection checkout started");
      });

      mongoose.connection.client.on("connectionCheckOutFailed", (event) => {
        this.metrics.errors++;
        logger.error("Connection checkout failed", {
          reason: event.reason,
        });
      });

      mongoose.connection.client.on("connectionCheckedOut", (event) => {
        this.metrics.idleConnections--;
        logger.debug("Connection checked out");
      });

      mongoose.connection.client.on("connectionCheckedIn", (event) => {
        this.metrics.idleConnections++;
        logger.debug("Connection checked in");
      });
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      poolSize:
        mongoose.connection.client?.topology?.s?.pool?.totalConnectionCount ||
        0,
      availableConnections:
        mongoose.connection.client?.topology?.s?.pool
          ?.availableConnectionCount || 0,
    };
  }

  logMetrics() {
    const metrics = this.getMetrics();
    logger.info("Connection pool metrics", metrics);
    return metrics;
  }

  // Graceful pool drain
  async drain() {
    logger.info("Draining connection pool");
    try {
      await mongoose.connection.close();
      logger.info("Connection pool drained successfully");
    } catch (error) {
      logger.error("Error draining connection pool", {
        error: error.message,
      });
      throw error;
    }
  }
}

export default new ConnectionPoolManager();
