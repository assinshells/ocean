// backend/src/config/db.js
import mongoose from "mongoose";
import env from "./env.js";
import logger from "./logger.js";
import connectionPool from "./connectionPool.js";

mongoose.set("strictQuery", true);

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4,
      // Дополнительные опции для production
      retryWrites: true,
      retryReads: true,
      compressors: ["zlib"], // Сжатие данных
      zlibCompressionLevel: 6,
    };

    const conn = await mongoose.connect(env.MONGO_URI, options);

    logger.info("MongoDB Connected", {
      host: conn.connection.host,
      name: conn.connection.name,
      poolSize: options.maxPoolSize,
    });

    // Логируем метрики пула каждые 5 минут
    setInterval(() => {
      connectionPool.logMetrics();
    }, 300000);

    // Обработка ошибок подключения
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error", { error: err.message });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, closing MongoDB connection`);
      try {
        await connectionPool.drain();
        logger.info("MongoDB connection closed through app termination");
        process.exit(0);
      } catch (error) {
        logger.error("Error during MongoDB shutdown", {
          error: error.message,
        });
        process.exit(1);
      }
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

    return conn;
  } catch (error) {
    logger.error("MongoDB Connection Error", { error: error.message });
    process.exit(1);
  }
};

export default connectDB;
