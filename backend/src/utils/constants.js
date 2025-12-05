/**
 * Константы приложения для централизованного управления
 */

export const MESSAGE_LIMITS = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 2000,
  RATE_LIMIT_COUNT: 10,
  RATE_LIMIT_WINDOW: 10000, // 10 секунд
};

export const USER_LIMITS = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  PASSWORD_MIN_LENGTH: 6,
};

export const TYPING_TIMEOUT = 3000; // 3 секунды

export const SOCKET_EVENTS = {
  // Server -> Client
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  MESSAGES_HISTORY: "messages:history",
  MESSAGE_NEW: "message:new",
  USERS_ONLINE: "users:online",
  USER_TYPING: "user:typing",
  USER_STOPPED_TYPING: "user:stopped-typing",
  ERROR: "error",

  // Client -> Server
  MESSAGE_SEND: "message:send",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
};

export const ERROR_CODES = {
  // Authentication
  AUTH_TOKEN_REQUIRED: "AUTH_TOKEN_REQUIRED",
  AUTH_INVALID_TOKEN: "AUTH_INVALID_TOKEN",
  AUTH_USER_NOT_FOUND: "AUTH_USER_NOT_FOUND",
  AUTH_ERROR: "AUTH_ERROR",

  // Messages
  INVALID_FORMAT: "INVALID_FORMAT",
  EMPTY_MESSAGE: "EMPTY_MESSAGE",
  MESSAGE_TOO_LONG: "MESSAGE_TOO_LONG",
  MESSAGE_SEND_FAILED: "MESSAGE_SEND_FAILED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
};

export default {
  MESSAGE_LIMITS,
  USER_LIMITS,
  TYPING_TIMEOUT,
  SOCKET_EVENTS,
  ERROR_CODES,
  HTTP_STATUS,
  PAGINATION,
};
