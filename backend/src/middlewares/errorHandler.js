import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";
import env from "../config/env.js";

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Логирование ошибки
  logger.error("Error occurred", {
    message: err.message,
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new ApiError(400, messages.join(", "));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field} already exists`;
    error = new ApiError(409, message);
  }

  // Mongoose CastError
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new ApiError(400, message);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Token expired");
  }

  // Если это не ApiError, создаём новый
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, false, err.stack);
  }

  const response = {
    success: false,
    message: error.message,
    ...(env.NODE_ENV === "development" && {
      stack: error.stack,
      originalError: err.message !== error.message ? err.message : undefined,
    }),
  };

  res.status(error.statusCode).json(response);
};

// Обработчик для 404
export const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

// Обработчик для необработанных промисов
export const handleUnhandledRejection = () => {
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection", {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    // В production лучше перезапустить процесс
    if (env.NODE_ENV === "production") {
      process.exit(1);
    }
  });
};

// Обработчик для необработанных исключений
export const handleUncaughtException = () => {
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", {
      message: error.message,
      stack: error.stack,
    });
    // Всегда выходим при uncaught exception
    process.exit(1);
  });
};
