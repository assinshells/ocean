// backend/src/utils/errorLogger.js
import logger from "../config/logger.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ERROR_LOG_DIR = path.resolve(__dirname, "../../logs/errors");

// Создаём директорию для логов ошибок
if (!fs.existsSync(ERROR_LOG_DIR)) {
  fs.mkdirSync(ERROR_LOG_DIR, { recursive: true });
}

class ErrorLogger {
  constructor() {
    this.errorCounts = new Map();
    this.lastCleanup = Date.now();
    this.CLEANUP_INTERVAL = 3600000; // 1 час
  }

  /**
   * Логирует ошибку авторизации
   */
  logAuthError(context, error) {
    logger.warn({
      msg: "Authentication failed",
      context: context.type || "unknown",
      error: {
        message: error.message,
        code: error.code,
      },
      username: context.username,
      ip: context.ip,
      timestamp: new Date().toISOString(),
    });

    this.incrementErrorCount("auth");
  }

  /**
   * Логирует ошибку валидации
   */
  logValidationError(context, errors) {
    logger.warn({
      msg: "Validation failed",
      errors,
      endpoint: context.endpoint,
      method: context.method,
      ip: context.ip,
      timestamp: new Date().toISOString(),
    });

    this.incrementErrorCount("validation");
  }

  /**
   * Логирует ошибку базы данных
   */
  logDatabaseError(context, error) {
    logger.error({
      msg: "Database error",
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack,
      },
      operation: context.operation,
      collection: context.collection,
      timestamp: new Date().toISOString(),
    });

    this.incrementErrorCount("database");

    // Записываем в отдельный файл для критических ошибок БД
    this.writeToErrorFile("database_errors.log", {
      timestamp: new Date().toISOString(),
      operation: context.operation,
      error: error.message,
    });
  }

  /**
   * Логирует ошибку Socket
   */
  logSocketError(context, error) {
    logger.error({
      msg: "Socket error",
      error: {
        message: error.message,
        code: error.code,
      },
      socketId: context.socketId,
      userId: context.userId,
      event: context.event,
      timestamp: new Date().toISOString(),
    });

    this.incrementErrorCount("socket");
  }

  /**
   * Логирует критическую ошибку сервера
   */
  logCriticalError(context, error) {
    logger.fatal({
      msg: "CRITICAL ERROR",
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
      context,
      timestamp: new Date().toISOString(),
    });

    // Записываем в файл критических ошибок
    this.writeToErrorFile("critical_errors.log", {
      timestamp: new Date().toISOString(),
      context,
      error: error.message,
      stack: error.stack,
    });

    this.incrementErrorCount("critical");
  }

  /**
   * Запись в файл (для критических случаев)
   */
  writeToErrorFile(filename, data) {
    try {
      const filepath = path.join(ERROR_LOG_DIR, filename);
      const logLine = JSON.stringify(data) + "\n";

      fs.appendFileSync(filepath, logLine, { encoding: "utf8" });
    } catch (err) {
      logger.error({
        msg: "Failed to write error log to file",
        error: err.message,
      });
    }
  }

  /**
   * Подсчёт ошибок для мониторинга
   */
  incrementErrorCount(type) {
    const count = this.errorCounts.get(type) || 0;
    this.errorCounts.set(type, count + 1);

    // Очистка старых счётчиков
    if (Date.now() - this.lastCleanup > this.CLEANUP_INTERVAL) {
      this.cleanup();
    }
  }

  /**
   * Получение статистики ошибок
   */
  getErrorStats() {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Очистка старых счётчиков
   */
  cleanup() {
    this.errorCounts.clear();
    this.lastCleanup = Date.now();
    logger.debug("Error counters reset");
  }
}

export default new ErrorLogger();