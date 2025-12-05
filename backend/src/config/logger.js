import pino from "pino";
import env from "./env.js";

// Конфигурация транспортов
const getTransport = () => {
  if (env.NODE_ENV === "development") {
    return {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
        singleLine: false,
        messageFormat: "{levelLabel} - {msg}",
      },
    };
  }

  // Production - JSON логи с ротацией
  return {
    target: "pino/file",
    options: {
      destination: "./logs/app.log",
      mkdir: true,
    },
  };
};

// Базовый logger
const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",

  // Serializers для правильного логирования объектов
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
      headers: res.getHeaders(),
    }),
    err: pino.stdSerializers.err,
  },

  // Добавление timestamp
  timestamp: pino.stdTimeFunctions.isoTime,

  // Базовые поля
  base: {
    env: env.NODE_ENV,
    pid: process.pid,
  },

  // Форматирование уровней
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },

  // Транспорт
  transport: getTransport(),
});

// Child logger с request ID для трейсинга
export const createRequestLogger = (req) => {
  const requestId = req.id || crypto.randomUUID();
  return logger.child({
    requestId,
    userId: req.user?._id?.toString(),
    username: req.user?.username,
  });
};

// Child logger для сервисов
export const createServiceLogger = (serviceName) => {
  return logger.child({ service: serviceName });
};

// Child logger для сокетов
export const createSocketLogger = (socket) => {
  return logger.child({
    socketId: socket.id,
    userId: socket.user?._id?.toString(),
    username: socket.user?.username,
  });
};

export default logger;
