// backend/src/config/logger.js - ЧИСТЫЕ ЛОГИ
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
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname,env,requestId",
        singleLine: false,
        messageFormat: "{msg}",
        levelFirst: true,
      },
    };
  }

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
    // ✅ ИСПРАВЛЕНО: Минимальный сериализатор req
    req: (req) => {
      if (!req) return {};

      return {
        method: req.method,
        url: req.url || req.originalUrl,
        ip: req.ip,
      };
    },

    // ✅ ИСПРАВЛЕНО: Минимальный сериализатор res
    res: (res) => {
      if (!res) return {};

      return {
        statusCode: res.statusCode,
      };
    },

    // ✅ НОВОЕ: Кастомный сериализатор ошибок БЕЗ stack
    err: (err) => {
      if (!err) return {};

      // В development показываем только message
      if (env.NODE_ENV === "development") {
        return {
          message: err.message,
          name: err.name,
          code: err.code,
          statusCode: err.statusCode,
        };
      }

      // В production логируем всё (включая stack)
      return {
        message: err.message,
        name: err.name,
        code: err.code,
        statusCode: err.statusCode,
        stack: err.stack,
      };
    },
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  base:
    env.NODE_ENV === "production"
      ? { env: env.NODE_ENV, pid: process.pid }
      : {}, // ✅ НОВОЕ: Убираем base в dev

  messageKey: "msg",

  transport: getTransport(),

  // Опции для форматирования
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
    // ✅ НОВОЕ: Убираем лишние поля из логов
    bindings: () => ({}),
  },
});

// --- CHILD-LOGGERS ---
export const createRequestLogger = (req) => {
  const requestId = req.id || crypto.randomUUID();

  // ✅ НОВОЕ: В development не добавляем requestId
  if (env.NODE_ENV === "development") {
    return logger.child({
      userId: req.user?._id?.toString(),
      username: req.user?.username,
    });
  }

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

  // ✅ НОВОЕ: В development минимальная информация
  if (env.NODE_ENV === "development") {
    return logger.child({
      userId: socket.user?._id?.toString(),
      username: socket.user?.username,
    });
  }

  return logger.child({
    socketId: socket.id,
    userId: socket.user?._id?.toString(),
    username: socket.user?.username,
  });
};

// Логируем старт приложения
logger.info("Logger initialized");

export default logger;
