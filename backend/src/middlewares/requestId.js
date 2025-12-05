import crypto from "crypto";

/**
 * Middleware для добавления уникального ID к каждому запросу
 * Используется для трейсинга и корреляции логов
 */
export const requestIdMiddleware = (req, res, next) => {
  // Проверяем наличие X-Request-ID из заголовка (для distributed tracing)
  req.id = req.headers["x-request-id"] || crypto.randomUUID();

  // Добавляем в заголовки ответа
  res.setHeader("X-Request-ID", req.id);

  next();
};

export default requestIdMiddleware;
