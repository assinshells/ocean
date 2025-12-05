// backend/src/config/logger.js
import pino from "pino";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import env from "./env.js";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, "../../logs");

// Гарантируем существование директории логов
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// --- ТРАНСПОРТЫ ---
const getTransport = () => {
  if (env.NODE_ENV === "development") {
    return {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
        singleLine: false,
        messageFormat: "{msg}",
        levelFirst: true,
      },
    };
  }

  // Production: пишем в файл
  return {
    target: "pino/file",
    options: {
      destination: path.join(LOG_DIR, "app.log"),
      mkdir: true,
    },
  };
};

// --- ОСНОВНОЙ ЛОГГЕР ---
const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",

  serializers: {
    // ✅ ИСПРАВЛЕНО: Безопасный сериализатор req
    req: (req) => {
      if (!req) return {};

      return {
        method: req.method,
        url: req.url || req.originalUrl,
        headers: req.headers
          ? {
              host: req.headers.host,
              "user-agent": req.headers["user-agent"],
            }
          : {},
        remoteAddress: req.ip,
        remotePort: req.connection?.remotePort,
      };
    },

    // ✅ ИСПРАВЛЕНО: Безопасный сериализатор res
    res: (res) => {
      if (!res) return {};

      return {
        statusCode: res.statusCode,
      };
    },

    // ✅ Стандартный сериализатор ошибок
    err: pino.stdSerializers.err,
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  base: {
    env: env.NODE_ENV,
    pid: process.pid,
  },

  messageKey: "msg",

  transport: getTransport(),

  // Опции для форматирования
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

// --- CHILD-LOGGERS ---
export const createRequestLogger = (req) => {
  const requestId = req.id || crypto.randomUUID();

  return logger.child({
    requestId,
    userId: req.user?._id?.toString(),
    username: req.user?.username,
  });
};

export const createServiceLogger = (service) => logger.child({ service });

export const createSocketLogger = (socket) => {
  if (!socket) {
    return logger.child({ socketId: "unknown" });
  }

  return logger.child({
    socketId: socket.id,
    userId: socket.user?._id?.toString(),
    username: socket.user?.username,
  });
};

// Логируем старт приложения
logger.info({
  msg: "Logger initialized",
  logDir: LOG_DIR,
  level: logger.level,
});

export default logger;
