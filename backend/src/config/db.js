import mongoose from "mongoose";
import env from "./env.js";
import logger from "./logger.js";

// Настройка mongoose для лучшей производительности
mongoose.set("strictQuery", true);

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4,
    };

    const conn = await mongoose.connect(env.MONGO_URI, options);

    logger.info("MongoDB Connected", {
      host: conn.connection.host,
      name: conn.connection.name,
    });

    // Обработка ошибок подключения
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error", { error: err.message });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed through app termination");
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error("MongoDB Connection Error", { error: error.message });
    process.exit(1);
  }
};

export default connectDB;
