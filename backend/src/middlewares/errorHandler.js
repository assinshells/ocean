// backend/src/middlewares/errorHandler.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
import errorHandlerService from "../services/errorHandlerService.js";
import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../utils/constants.js";
import env from "../config/env.js";

export const errorHandler = (err, req, res, next) => {
  const logger = req.logger || req.log || console;

  // Нормализуем ошибку
  const normalizedError = errorHandlerService.normalizeError(err);

  // Логируем ошибку
  errorHandlerService.logError(normalizedError, req);

  // Форматируем ответ
  const includeStack = env.NODE_ENV === "development";
  const response = errorHandlerService.formatErrorResponse(
    normalizedError,
    includeStack
  );

  res.status(normalizedError.statusCode).json(response);
};

export const notFound = (req, res, next) => {
  const error = new ApiError(
    HTTP_STATUS.NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`
  );
  next(error);
};

export const handleUnhandledRejection = () => {
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);

    if (env.NODE_ENV === "production") {
      console.error("Shutting down due to unhandled rejection...");
      process.exit(1);
    }
  });
};

export const handleUncaughtException = () => {
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
  });
};
