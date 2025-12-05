// backend/src/services/errorHandlerService.js
import logger from "../config/logger.js";
import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../utils/constants.js";

class ErrorHandlerService {
  constructor() {
    this.errorTypes = {
      ValidationError: this.handleValidationError.bind(this),
      CastError: this.handleCastError.bind(this),
      JsonWebTokenError: this.handleJWTError.bind(this),
      TokenExpiredError: this.handleTokenExpiredError.bind(this),
      MongoServerError: this.handleMongoError.bind(this),
    };
  }

  handleValidationError(err) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      messages.join(", "),
      true,
      err.stack
    );
  }

  handleCastError(err) {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, true, err.stack);
  }

  handleJWTError(err) {
    return new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Invalid token",
      true,
      err.stack
    );
  }

  handleTokenExpiredError(err) {
    return new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Token expired",
      true,
      err.stack
    );
  }

  handleMongoError(err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      const message = `${field} already exists`;
      return new ApiError(HTTP_STATUS.CONFLICT, message, true, err.stack);
    }

    return new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Database error",
      false,
      err.stack
    );
  }

  normalizeError(err) {
    if (err instanceof ApiError) {
      return err;
    }

    const handler = this.errorTypes[err.name];
    if (handler) {
      return handler(err);
    }

    const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = err.message || "Internal Server Error";

    return new ApiError(statusCode, message, false, err.stack);
  }

  logError(err, req) {
    const logLevel = err.statusCode >= 500 ? "error" : "warn";

    // ИСПРАВЛЕНО: используем правильный формат с msg
    req.logger[logLevel]({
      msg: "Error occurred",
      err: {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        name: err.name,
        code: err.code,
        statusCode: err.statusCode,
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
    });
  }

  formatErrorResponse(err, includeStack = false) {
    const response = {
      success: false,
      message: err.message,
      code: err.code,
    };

    if (includeStack && err.stack) {
      response.stack = err.stack;
    }

    return response;
  }
}

export default new ErrorHandlerService();
