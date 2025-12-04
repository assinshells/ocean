import env from "../config/env.js";
import logger from "../config/logger.js";

class RateLimiter {
  constructor() {
    this.requestCounts = new Map();
    this.cleanup();
  }

  cleanup() {
    // Очистка каждую минуту для предотвращения memory leak
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let deletedCount = 0;

      for (const [key, record] of this.requestCounts.entries()) {
        if (now > record.resetTime) {
          this.requestCounts.delete(key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.debug("Rate limiter cleanup", { deleted: deletedCount });
      }
    }, 60000);
  }

  middleware(options = {}) {
    const {
      windowMs = env.RATE_LIMIT_WINDOW_MS || 900000,
      max = env.RATE_LIMIT_MAX || 100,
      message = "Too many requests, please try again later",
      skipSuccessfulRequests = false,
      keyGenerator = (req) => {
        return (
          req.ip ||
          req.headers["x-forwarded-for"] ||
          req.connection.remoteAddress
        );
      },
    } = options;

    return (req, res, next) => {
      const key = keyGenerator(req);
      const now = Date.now();

      if (!this.requestCounts.has(key)) {
        this.requestCounts.set(key, {
          count: 1,
          resetTime: now + windowMs,
        });
        return next();
      }

      const record = this.requestCounts.get(key);

      // Сброс счётчика если истекло время
      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return next();
      }

      // Проверка лимита
      if (record.count >= max) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);

        res.set({
          "Retry-After": retryAfter,
          "X-RateLimit-Limit": max,
          "X-RateLimit-Remaining": 0,
          "X-RateLimit-Reset": new Date(record.resetTime).toISOString(),
        });

        logger.warn("Rate limit exceeded", {
          key: key.substring(0, 20),
          count: record.count,
          max,
        });

        return res.status(429).json({
          success: false,
          message,
          retryAfter,
        });
      }

      // Увеличение счётчика
      record.count++;

      // Добавление заголовков
      res.set({
        "X-RateLimit-Limit": max,
        "X-RateLimit-Remaining": max - record.count,
        "X-RateLimit-Reset": new Date(record.resetTime).toISOString(),
      });

      // Пропуск успешных запросов если указано
      if (skipSuccessfulRequests) {
        res.on("finish", () => {
          if (res.statusCode < 400) {
            record.count--;
          }
        });
      }

      next();
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requestCounts.clear();
  }
}

const rateLimiter = new RateLimiter();

// Экспорт фабрики middleware
export const rateLimit = (options) => rateLimiter.middleware(options);

// Очистка при завершении процесса
process.on("SIGTERM", () => rateLimiter.destroy());
process.on("SIGINT", () => rateLimiter.destroy());

export default rateLimiter;
