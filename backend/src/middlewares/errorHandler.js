import ApiError from "../utils/ApiError.js";
import env from "../config/env.js";
import { HTTP_STATUS } from "../utils/constants.js";

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Используем logger из req (созданный в httpLogger middleware)
  const logger = req.logger || req.log || console;

  // Структурированное логирование ошибки
  const errorLog = {
    msg: "Error occurred",
    err: {
      message: err.message,
      stack: env.NODE_ENV === "development" ? err.stack : undefined,
      name: err.name,
      code: err.code,
    },
    req: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    },
    user: req.user
      ? {
          id: req.user._id?.toString(),
          username: req.user.username,
        }
      : undefined,
  };

  logger.error(errorLog);

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new ApiError(HTTP_STATUS.BAD_REQUEST, messages.join(", "));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    const message = `${field} already exists`;
    error = new ApiError(HTTP_STATUS.CONFLICT, message);
  }

  // Mongoose CastError
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new ApiError(HTTP_STATUS.BAD_REQUEST, message);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    error = new ApiError(HTTP_STATUS.UNAUTHORIZED, "Token expired");
  }

  // Если это не ApiError, создаём новый
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, false, err.stack);
  }

  // Подготовка ответа
  const response = {
    success: false,
    message: error.message,
    code: error.code,
  };

  // Добавляем доп. информацию только в development
  if (env.NODE_ENV === "development") {
    response.stack = error.stack;
    response.originalError =
      err.message !== error.message ? err.message : undefined;
  }

  res.status(error.statusCode).json(response);
};

// Обработчик для 404
export const notFound = (req, res, next) => {
  const error = new ApiError(
    HTTP_STATUS.NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`
  );
  next(error);
};

// Обработчик для необработанных промисов (для сервера)
export const handleUnhandledRejection = () => {
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);

    // В production лучше перезапустить процесс (PM2, Kubernetes сделают это автоматически)
    if (env.NODE_ENV === "production") {
      console.error("Shutting down due to unhandled rejection...");
      process.exit(1);
    }
  });
};

// Обработчик для необработанных исключений (для сервера)
export const handleUncaughtException = () => {
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Всегда выходим при uncaught exception
    process.exit(1);
  });
};
