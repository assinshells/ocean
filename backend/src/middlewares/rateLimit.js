// backend/src/middlewares/rateLimit.js
import env from "../config/env.js";
import logger from "../config/logger.js";

class RateLimiter {
  constructor() {
    this.requestCounts = new Map();
    this.blacklist = new Set(); // Блокировка злоумышленников
    this.startCleanup();
  }

  startCleanup() {
    // Cleanup каждую минуту
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);

    // Очистка blacklist каждый час
    this.blacklistCleanupInterval = setInterval(() => {
      this.blacklist.clear();
      logger.info("Rate limiter blacklist cleared");
    }, 3600000);
  }

  cleanup() {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, record] of this.requestCounts.entries()) {
      if (now > record.resetTime) {
        this.requestCounts.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.debug("Rate limiter cleanup", {
        deleted: deletedCount,
        remaining: this.requestCounts.size,
      });
    }
  }

  middleware(options = {}) {
    const {
      windowMs = env.RATE_LIMIT_WINDOW_MS || 900000,
      max = env.RATE_LIMIT_MAX || 100,
      message = "Too many requests, please try again later",
      skipSuccessfulRequests = false,
      blockDuration = 3600000, // 1 час блокировки при злоупотреблении
      blockThreshold = 5, // Количество превышений лимита для блокировки
      keyGenerator = (req) => {
        return (
          req.ip ||
          req.headers["x-forwarded-for"]?.split(",")[0] ||
          req.connection.remoteAddress
        );
      },
    } = options;

    return (req, res, next) => {
      const key = keyGenerator(req);
      const now = Date.now();

      // Проверка blacklist
      if (this.blacklist.has(key)) {
        logger.warn("Blocked request from blacklisted IP", { key });
        return res.status(403).json({
          success: false,
          message: "Access denied. Too many violations.",
        });
      }

      if (!this.requestCounts.has(key)) {
        this.requestCounts.set(key, {
          count: 1,
          resetTime: now + windowMs,
          violations: 0,
        });

        this.setHeaders(res, max, max - 1, now + windowMs);
        return next();
      }

      const record = this.requestCounts.get(key);

      // Сброс счётчика если истекло время
      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        record.violations = Math.max(0, record.violations - 1); // Уменьшаем нарушения

        this.setHeaders(res, max, max - 1, record.resetTime);
        return next();
      }

      // Проверка лимита
      if (record.count >= max) {
        record.violations++;

        // Блокировка при множественных нарушениях
        if (record.violations >= blockThreshold) {
          this.blacklist.add(key);
          logger.error("IP blacklisted due to rate limit violations", {
            key,
            violations: record.violations,
          });

          return res.status(403).json({
            success: false,
            message: "Access denied. Too many violations.",
          });
        }

        const retryAfter = Math.ceil((record.resetTime - now) / 1000);

        this.setHeaders(res, max, 0, record.resetTime, retryAfter);

        logger.warn("Rate limit exceeded", {
          key: key.substring(0, 20),
          count: record.count,
          max,
          violations: record.violations,
        });

        return res.status(429).json({
          success: false,
          message,
          retryAfter,
        });
      }

      // Увеличение счётчика
      record.count++;

      this.setHeaders(res, max, max - record.count, record.resetTime);

      // Пропуск успешных запросов
      if (skipSuccessfulRequests) {
        res.on("finish", () => {
          if (res.statusCode < 400) {
            record.count = Math.max(0, record.count - 1);
          }
        });
      }

      next();
    };
  }

  setHeaders(res, limit, remaining, resetTime, retryAfter = null) {
    res.set({
      "X-RateLimit-Limit": limit,
      "X-RateLimit-Remaining": remaining,
      "X-RateLimit-Reset": new Date(resetTime).toISOString(),
    });

    if (retryAfter !== null) {
      res.set("Retry-After", retryAfter);
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.blacklistCleanupInterval) {
      clearInterval(this.blacklistCleanupInterval);
    }
    this.requestCounts.clear();
    this.blacklist.clear();
    logger.info("Rate limiter destroyed");
  }
}

const rateLimiter = new RateLimiter();

export const rateLimit = (options) => rateLimiter.middleware(options);

// Очистка при завершении
process.on("SIGTERM", () => rateLimiter.destroy());
process.on("SIGINT", () => rateLimiter.destroy());

export default rateLimiter;
