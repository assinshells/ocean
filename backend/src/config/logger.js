// backend/src/config/logger.js
import pino from "pino";
import env from "./env.js";
import crypto from "crypto";

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

  return {
    target: "pino/file",
    options: {
      destination: "./logs/app.log",
      mkdir: true,
    },
  };
};

// --- ОСНОВНОЙ ЛОГГЕР ---
const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",

  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: req.headers,
      remoteAddress: req.ip,
      remotePort: req.connection?.remotePort,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders?.() || {},
    }),
    err: pino.stdSerializers.err,
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  base: {
    env: env.NODE_ENV,
  },

  messageKey: "msg",

  transport: getTransport(),
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

export const createSocketLogger = (socket) =>
  logger.child({
    socketId: socket.id,
    userId: socket.user?._id?.toString(),
    username: socket.user?.username,
  });

export default logger;
