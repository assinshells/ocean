import { createRequestLogger } from "../config/logger.js";

export const httpLogger = (req, res, next) => {
  const startTime = Date.now();

  // Создаём child logger для этого запроса
  req.logger = createRequestLogger(req);

  // ИСПРАВЛЕНО: используем правильный формат логирования
  req.logger.info({
    msg: "Incoming request",
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

      const contentLength = res.getHeader("content-length");

      // ИСПРАВЛЕНО: добавляем msg в логи
      req.logger[logLevel]({
        msg: "Request completed",
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
      req.logger.debug({
        msg: "Response finished",
        statusCode: res.statusCode,
        duration,
      });
      responseLogged = true;
    }
  });

  res.on("close", () => {
    if (!responseLogged) {
      const duration = Date.now() - startTime;
      req.logger.warn({
        msg: "Response closed without finishing",
        duration,
      });
      responseLogged = true;
    }
  });

  res.on("error", (err) => {
    if (!responseLogged) {
      const duration = Date.now() - startTime;
      req.logger.error({
        msg: "Response error",
        err, // Pino автоматически сериализует ошибку
        duration,
      });
      responseLogged = true;
    }
  });

  next();
};

export default httpLogger;
