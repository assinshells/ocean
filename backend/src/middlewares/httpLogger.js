import { createRequestLogger } from "../config/logger.js";

/**
 * Express middleware для логирования HTTP запросов
 * Совместим с Express 5
 */
export const httpLogger = (req, res, next) => {
  const startTime = Date.now();

  // Создаём child logger для этого запроса
  req.logger = createRequestLogger(req);

  // Логируем входящий запрос
  req.logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    userAgent: req.headers["user-agent"],
    contentType: req.headers["content-type"],
    ip: req.ip,
  });

  // Перехватываем завершение ответа
  const originalSend = res.send;
  const originalJson = res.json;
  let responseLogged = false;

  const logResponse = () => {
    if (!responseLogged) {
      responseLogged = true;
      const duration = Date.now() - startTime;
      const logLevel =
        res.statusCode >= 500
          ? "error"
          : res.statusCode >= 400
          ? "warn"
          : "info";

      // Express 5: используем res.getHeader() вместо res.get()
      const contentLength = res.getHeader("content-length");

      req.logger[logLevel]("Request completed", {
        statusCode: res.statusCode,
        contentLength: contentLength,
        duration,
      });
    }
  };

  // Перехватываем res.send
  res.send = function (data) {
    res.send = originalSend;
    logResponse();
    return res.send(data);
  };

  // Перехватываем res.json
  res.json = function (data) {
    res.json = originalJson;
    logResponse();
    return res.json(data);
  };

  // Обработка событий
  res.on("finish", () => {
    if (!responseLogged) {
      const duration = Date.now() - startTime;
      req.logger.debug("Response finished", {
        statusCode: res.statusCode,
        duration,
      });
      responseLogged = true;
    }
  });

  res.on("close", () => {
    if (!responseLogged) {
      const duration = Date.now() - startTime;
      req.logger.warn("Response closed without finishing", {
        duration,
      });
      responseLogged = true;
    }
  });

  res.on("error", (err) => {
    if (!responseLogged) {
      const duration = Date.now() - startTime;
      req.logger.error("Response error", {
        error: err.message,
        stack: err.stack,
        duration,
      });
      responseLogged = true;
    }
  });

  next();
};

export default httpLogger;
