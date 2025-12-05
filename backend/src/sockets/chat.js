// backend/src/sockets/chat.js
import Message from "../models/Message.js";
import User from "../models/User.js";
import { verifyToken } from "../utils/token.js";
import { createSocketLogger } from "../config/logger.js";
import logger from "../config/logger.js";
import DOMPurify from "isomorphic-dompurify";
import {
  MESSAGE_LIMITS,
  SOCKET_EVENTS,
  ERROR_CODES,
} from "../utils/constants.js";

class SocketManager {
  constructor() {
    this.connectedUsers = new Map();
    this.typingUsers = new Map();
    this.messageRateLimiter = new Map();
    // ВАЖНО: Добавляем Set для отслеживания всех таймеров
    this.activeTimeouts = new Set();
  }

  // Безопасное создание таймера с автоочисткой
  createManagedTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      callback();
    }, delay);
    this.activeTimeouts.add(timeoutId);
    return timeoutId;
  }

  // Безопасная очистка таймера
  clearManagedTimeout(timeoutId) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.activeTimeouts.delete(timeoutId);
    }
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        logger.warn("Socket authentication failed: no token", {
          socketId: socket.id,
          ip: socket.handshake.address,
        });
        const error = new Error("Token required");
        error.data = { code: ERROR_CODES.AUTH_TOKEN_REQUIRED };
        return next(error);
      }

      const decoded = verifyToken(token);

      if (!decoded?.userId) {
        logger.warn("Socket authentication failed: invalid token", {
          socketId: socket.id,
        });
        const error = new Error("Invalid token");
        error.data = { code: ERROR_CODES.AUTH_INVALID_TOKEN };
        return next(error);
      }

      const user = await User.findById(decoded.userId)
        .select("-password -resetPasswordToken -resetPasswordExpires")
        .lean();

      if (!user) {
        logger.warn("Socket authentication failed: user not found", {
          userId: decoded.userId,
          socketId: socket.id,
        });
        const error = new Error("User not found");
        error.data = { code: ERROR_CODES.AUTH_USER_NOT_FOUND };
        return next(error);
      }

      socket.user = user;
      next();
    } catch (error) {
      logger.error("Socket authentication error", {
        error: error.message,
        stack: error.stack,
        socketId: socket.id,
      });
      const err = new Error("Authentication error");
      err.data = { code: ERROR_CODES.AUTH_ERROR };
      next(err);
    }
  }

  async handleConnection(io, socket) {
    const user = socket.user;
    const userId = user._id.toString();
    const socketLogger = createSocketLogger(socket);

    socketLogger.info("User connected");

    try {
      // Отключаем предыдущее соединение
      const existingSocketId = this.connectedUsers.get(userId);
      if (existingSocketId && existingSocketId !== socket.id) {
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          socketLogger.info("Disconnecting previous session", {
            oldSocketId: existingSocketId,
          });
          // Очищаем ресурсы старого соединения перед disconnect
          this.cleanupSocketResources(existingSocketId);
          existingSocket.disconnect(true);
        }
      }

      // Обновляем статус пользователя
      await User.findByIdAndUpdate(
        user._id,
        {
          isOnline: true,
          lastSeen: Date.now(),
          socketId: socket.id,
        },
        { new: true }
      );

      this.connectedUsers.set(userId, socket.id);

      // Отправляем обновлённый список пользователей
      await this.broadcastOnlineUsers(io);

      // Отправляем историю сообщений с обработкой ошибок
      try {
        const recentMessages = await Message.getRecent(50);
        socket.emit(SOCKET_EVENTS.MESSAGES_HISTORY, recentMessages);
        socketLogger.debug("Message history sent", {
          count: recentMessages.length,
        });
      } catch (error) {
        socketLogger.error("Failed to load message history", {
          error: error.message,
        });
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Failed to load message history",
          code: "HISTORY_LOAD_FAILED",
        });
      }

      // Регистрируем обработчики событий
      socket.on(SOCKET_EVENTS.MESSAGE_SEND, async (data) => {
        await this.handleMessageSend(io, socket, data, socketLogger);
      });

      socket.on(SOCKET_EVENTS.TYPING_START, () => {
        this.handleTypingStart(io, socket, socketLogger);
      });

      socket.on(SOCKET_EVENTS.TYPING_STOP, () => {
        this.handleTypingStop(io, socket, socketLogger);
      });

      socket.on(SOCKET_EVENTS.DISCONNECT, async (reason) => {
        await this.handleDisconnect(io, socket, reason, socketLogger);
      });
    } catch (error) {
      socketLogger.error("Connection handling error", {
        error: error.message,
        stack: error.stack,
      });
      socket.disconnect(true);
    }
  }

  checkMessageRateLimit(socketId) {
    const now = Date.now();
    const limit = MESSAGE_LIMITS.RATE_LIMIT_COUNT;
    const window = MESSAGE_LIMITS.RATE_LIMIT_WINDOW;

    if (!this.messageRateLimiter.has(socketId)) {
      this.messageRateLimiter.set(socketId, {
        count: 1,
        resetTime: now + window,
      });
      return true;
    }

    const record = this.messageRateLimiter.get(socketId);

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + window;
      return true;
    }

    if (record.count >= limit) {
      return false;
    }

    record.count++;
    return true;
  }

  async handleMessageSend(io, socket, data, socketLogger) {
    try {
      const user = socket.user;

      // Rate limiting
      if (!this.checkMessageRateLimit(socket.id)) {
        socketLogger.warn("Message rate limit exceeded");
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Too many messages. Please slow down.",
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        });
        return;
      }

      // Валидация входных данных
      if (!data?.text || typeof data.text !== "string") {
        socketLogger.warn("Invalid message format", { data });
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Invalid message format",
          code: ERROR_CODES.INVALID_FORMAT,
        });
        return;
      }

      const text = data.text.trim();

      if (!text || text.length === 0) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Message cannot be empty",
          code: ERROR_CODES.EMPTY_MESSAGE,
        });
        return;
      }

      if (text.length > MESSAGE_LIMITS.MAX_LENGTH) {
        socketLogger.warn("Message too long", { length: text.length });
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: `Message too long (max ${MESSAGE_LIMITS.MAX_LENGTH} characters)`,
          code: ERROR_CODES.MESSAGE_TOO_LONG,
        });
        return;
      }

      // Sanitize текста
      const sanitizedText = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });

      // Создание и сохранение сообщения
      const message = new Message({
        senderId: user._id,
        username: user.username,
        text: sanitizedText,
        timestamp: new Date(),
      });

      await message.save();

      // Broadcast нового сообщения
      const messageData = {
        _id: message._id,
        senderId: message.senderId,
        username: message.username,
        text: message.text,
        timestamp: message.timestamp,
      };

      io.emit(SOCKET_EVENTS.MESSAGE_NEW, messageData);

      socketLogger.debug("Message sent", {
        messageId: message._id.toString(),
        textLength: sanitizedText.length,
      });
    } catch (error) {
      socketLogger.error("Message send error", {
        error: error.message,
        stack: error.stack,
      });

      socket.emit(SOCKET_EVENTS.ERROR, {
        message: "Failed to send message",
        code: ERROR_CODES.MESSAGE_SEND_FAILED,
      });
    }
  }

  handleTypingStart(io, socket, socketLogger) {
    const user = socket.user;

    // Очищаем предыдущий таймаут
    const existing = this.typingUsers.get(socket.id);
    if (existing?.timeoutId) {
      this.clearManagedTimeout(existing.timeoutId);
    }

    // Создаём управляемый таймаут
    const timeoutId = this.createManagedTimeout(() => {
      this.handleTypingStop(io, socket, socketLogger);
    }, 3000);

    this.typingUsers.set(socket.id, {
      username: user.username,
      timeoutId,
    });

    socket.broadcast.emit(SOCKET_EVENTS.USER_TYPING, {
      username: user.username,
    });

    socketLogger.debug("User started typing");
  }

  handleTypingStop(io, socket, socketLogger) {
    const user = socket.user;
    const existing = this.typingUsers.get(socket.id);

    if (existing) {
      this.clearManagedTimeout(existing.timeoutId);
      this.typingUsers.delete(socket.id);

      socket.broadcast.emit(SOCKET_EVENTS.USER_STOPPED_TYPING, {
        username: user.username,
      });

      socketLogger.debug("User stopped typing");
    }
  }

  // НОВЫЙ МЕТОД: Централизованная очистка ресурсов сокета
  cleanupSocketResources(socketId) {
    // Очищаем typing таймаут
    const typingData = this.typingUsers.get(socketId);
    if (typingData?.timeoutId) {
      this.clearManagedTimeout(typingData.timeoutId);
      this.typingUsers.delete(socketId);
    }

    // Очищаем rate limiter
    this.messageRateLimiter.delete(socketId);
  }

  async handleDisconnect(io, socket, reason, socketLogger) {
    const user = socket.user;
    const userId = user._id.toString();

    socketLogger.info("User disconnected", { reason });

    // Очистка ресурсов сокета
    this.cleanupSocketResources(socket.id);

    try {
      // Обновляем статус пользователя
      await User.findByIdAndUpdate(
        user._id,
        {
          isOnline: false,
          lastSeen: Date.now(),
          socketId: null,
        },
        { new: true }
      );

      // Удаляем из мапы подключенных пользователей
      this.connectedUsers.delete(userId);

      // Broadcast обновлённого списка
      await this.broadcastOnlineUsers(io);
    } catch (error) {
      socketLogger.error("Error updating user status on disconnect", {
        error: error.message,
      });
    }
  }

  async broadcastOnlineUsers(io) {
    try {
      const onlineUsers = await User.getOnlineUsers();
      io.emit(SOCKET_EVENTS.USERS_ONLINE, onlineUsers);
      logger.debug("Online users broadcasted", {
        count: onlineUsers.length,
      });
    } catch (error) {
      logger.error("Failed to broadcast online users", {
        error: error.message,
      });
    }
  }

  initialize(io) {
    // Middleware для аутентификации
    io.use((socket, next) => this.authenticateSocket(socket, next));

    // Обработчик подключения
    io.on(SOCKET_EVENTS.CONNECT, (socket) => this.handleConnection(io, socket));

    logger.info("Socket.IO initialized");
  }

  // УЛУЧШЕННЫЙ cleanup с очисткой всех таймеров
  cleanup() {
    logger.info("Cleaning up socket manager resources");

    // Очищаем все активные таймеры
    this.activeTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.activeTimeouts.clear();

    // Очищаем typing таймауты (double check)
    this.typingUsers.forEach((value) => {
      if (value.timeoutId) {
        clearTimeout(value.timeoutId);
      }
    });

    this.typingUsers.clear();
    this.connectedUsers.clear();
    this.messageRateLimiter.clear();

    logger.info("Socket manager cleanup completed");
  }
}

const socketManager = new SocketManager();

// Очистка при завершении процесса
process.on("SIGTERM", () => socketManager.cleanup());
process.on("SIGINT", () => socketManager.cleanup());

export default (io) => socketManager.initialize(io);
