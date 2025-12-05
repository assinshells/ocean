import Message from "../models/Message.js";
import User from "../models/User.js";
import { verifyToken } from "../utils/token.js";
import { createSocketLogger } from "../config/logger.js";
import logger from "../config/logger.js";
import DOMPurify from "isomorphic-dompurify";

class SocketManager {
  constructor() {
    this.connectedUsers = new Map(); // userId -> socketId
    this.typingUsers = new Map(); // socketId -> { username, timeoutId }
    this.messageRateLimiter = new Map(); // socketId -> { count, resetTime }
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
        error.data = { code: "AUTH_TOKEN_REQUIRED" };
        return next(error);
      }

      const decoded = verifyToken(token);

      if (!decoded || !decoded.userId) {
        logger.warn("Socket authentication failed: invalid token", {
          socketId: socket.id,
        });
        const error = new Error("Invalid token");
        error.data = { code: "AUTH_INVALID_TOKEN" };
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
        error.data = { code: "AUTH_USER_NOT_FOUND" };
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
      err.data = { code: "AUTH_ERROR" };
      next(err);
    }
  }

  async handleConnection(io, socket) {
    const user = socket.user;
    const userId = user._id.toString();
    const socketLogger = createSocketLogger(socket);

    socketLogger.info("User connected");

    try {
      // Отключаем предыдущее соединение если есть
      const existingSocketId = this.connectedUsers.get(userId);
      if (existingSocketId && existingSocketId !== socket.id) {
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          socketLogger.info("Disconnecting previous session", {
            oldSocketId: existingSocketId,
          });
          existingSocket.disconnect(true);
        }
      }

      // Обновляем статус в БД и мапу
      await User.findByIdAndUpdate(user._id, {
        isOnline: true,
        lastSeen: Date.now(),
        socketId: socket.id,
      });

      this.connectedUsers.set(userId, socket.id);

      // Отправляем список онлайн пользователей
      await this.broadcastOnlineUsers(io);

      // Отправляем историю сообщений
      try {
        const recentMessages = await Message.getRecent(50);
        socket.emit("messages:history", recentMessages);
        socketLogger.debug("Message history sent", {
          count: recentMessages.length,
        });
      } catch (error) {
        socketLogger.error("Failed to load message history", {
          error: error.message,
        });
      }

      // Обработчик отправки сообщения
      socket.on("message:send", async (data) => {
        await this.handleMessageSend(io, socket, data, socketLogger);
      });

      // Обработчик начала набора
      socket.on("typing:start", () => {
        this.handleTypingStart(socket, socketLogger);
      });

      // Обработчик окончания набора
      socket.on("typing:stop", () => {
        this.handleTypingStop(socket, socketLogger);
      });

      // Обработчик отключения
      socket.on("disconnect", async (reason) => {
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

  // Rate limiting для сообщений
  checkMessageRateLimit(socketId) {
    const now = Date.now();
    const limit = 10; // 10 сообщений
    const window = 10000; // за 10 секунд

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
        socket.emit("error", {
          message: "Too many messages. Please slow down.",
          code: "RATE_LIMIT_EXCEEDED",
        });
        return;
      }

      // Валидация
      if (!data || !data.text || typeof data.text !== "string") {
        socketLogger.warn("Invalid message format", { data });
        socket.emit("error", {
          message: "Invalid message format",
          code: "INVALID_FORMAT",
        });
        return;
      }

      const text = data.text.trim();

      if (!text || text.length === 0) {
        socket.emit("error", {
          message: "Message cannot be empty",
          code: "EMPTY_MESSAGE",
        });
        return;
      }

      if (text.length > 2000) {
        socketLogger.warn("Message too long", {
          length: text.length,
        });
        socket.emit("error", {
          message: "Message too long (max 2000 characters)",
          code: "MESSAGE_TOO_LONG",
        });
        return;
      }

      // Sanitize для защиты от XSS
      const sanitizedText = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });

      const message = new Message({
        senderId: user._id,
        username: user.username,
        text: sanitizedText,
        timestamp: new Date(),
      });

      await message.save();

      // Отправляем всем подключённым клиентам
      io.emit("message:new", {
        _id: message._id,
        senderId: message.senderId,
        username: message.username,
        text: message.text,
        timestamp: message.timestamp,
      });

      socketLogger.debug("Message sent", {
        messageId: message._id.toString(),
        textLength: sanitizedText.length,
      });
    } catch (error) {
      socketLogger.error("Message send error", {
        error: error.message,
        stack: error.stack,
      });

      socket.emit("error", {
        message: "Failed to send message",
        code: "MESSAGE_SEND_FAILED",
      });
    }
  }

  handleTypingStart(socket, socketLogger) {
    const user = socket.user;

    // Очищаем предыдущий таймаут если есть
    const existing = this.typingUsers.get(socket.id);
    if (existing?.timeoutId) {
      clearTimeout(existing.timeoutId);
    }

    // Устанавливаем новый таймаут (автоматическая остановка через 3 сек)
    const timeoutId = setTimeout(() => {
      this.handleTypingStop(socket, socketLogger);
    }, 3000);

    this.typingUsers.set(socket.id, {
      username: user.username,
      timeoutId,
    });

    socket.broadcast.emit("user:typing", {
      username: user.username,
    });

    socketLogger.debug("User started typing");
  }

  handleTypingStop(socket, socketLogger) {
    const user = socket.user;
    const existing = this.typingUsers.get(socket.id);

    if (existing) {
      if (existing.timeoutId) {
        clearTimeout(existing.timeoutId);
      }
      this.typingUsers.delete(socket.id);

      socket.broadcast.emit("user:stopped-typing", {
        username: user.username,
      });

      socketLogger.debug("User stopped typing");
    }
  }

  async handleDisconnect(io, socket, reason, socketLogger) {
    const user = socket.user;
    const userId = user._id.toString();

    socketLogger.info("User disconnected", { reason });

    // КРИТИЧЕСКИ ВАЖНО: Очищаем typing таймаут
    const typingData = this.typingUsers.get(socket.id);
    if (typingData?.timeoutId) {
      clearTimeout(typingData.timeoutId);
      this.typingUsers.delete(socket.id);
    }

    // Очищаем rate limiter
    this.messageRateLimiter.delete(socket.id);

    try {
      // Обновляем статус в БД
      await User.findByIdAndUpdate(user._id, {
        isOnline: false,
        lastSeen: Date.now(),
        socketId: null,
      });

      // Удаляем из мапы
      this.connectedUsers.delete(userId);

      // Отправляем обновлённый список онлайн пользователей
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
      io.emit("users:online", onlineUsers);
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
    io.on("connection", (socket) => this.handleConnection(io, socket));

    logger.info("Socket.IO initialized");
  }

  // Полная очистка всех ресурсов
  cleanup() {
    // Очищаем все typing таймауты
    this.typingUsers.forEach((value) => {
      if (value.timeoutId) {
        clearTimeout(value.timeoutId);
      }
    });

    this.typingUsers.clear();
    this.connectedUsers.clear();
    this.messageRateLimiter.clear();

    logger.info("Socket manager cleaned up");
  }
}

const socketManager = new SocketManager();

// Очистка при завершении процесса
process.on("SIGTERM", () => socketManager.cleanup());
process.on("SIGINT", () => socketManager.cleanup());

export default (io) => socketManager.initialize(io);
