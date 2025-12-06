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
    this.activeTimeouts = new Set();
  }

  createManagedTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      callback();
    }, delay);
    this.activeTimeouts.add(timeoutId);
    return timeoutId;
  }

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

      if (!decoded || !decoded.userId) {
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
      const existingSocketId = this.connectedUsers.get(userId);
      if (existingSocketId && existingSocketId !== socket.id) {
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          socketLogger.info("Disconnecting previous session", {
            oldSocketId: existingSocketId,
          });
          this.cleanupSocketResources(existingSocketId);
          existingSocket.disconnect(true);
        }
      }

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

      await this.broadcastOnlineUsers(io);

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

      // ✅ УЛУЧШЕНО: Детальное логирование входящих данных
      socketLogger.info("Received message:send event", {
        hasData: !!data,
        dataType: typeof data,
        dataKeys: data ? Object.keys(data) : [],
        rawData: JSON.stringify(data), // ✅ НОВОЕ: Логируем полные данные
      });

      // Rate limiting
      if (!this.checkMessageRateLimit(socket.id)) {
        socketLogger.warn("Message rate limit exceeded");
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Too many messages. Please slow down.",
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        });
        return;
      }

      // ✅ Валидация данных
      if (!data) {
        socketLogger.warn("Message send failed: no data provided");
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "No data provided",
          code: ERROR_CODES.INVALID_FORMAT,
        });
        return;
      }

      if (!data.text || typeof data.text !== "string") {
        socketLogger.warn("Invalid message format", {
          hasText: !!data.text,
          textType: typeof data.text,
          data,
        });
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Invalid message format",
          code: ERROR_CODES.INVALID_FORMAT,
        });
        return;
      }

      const text = data.text.trim();

      if (!text || text.length === 0) {
        socketLogger.warn("Empty message");
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

      socketLogger.info("Creating message", {
        originalLength: text.length,
        sanitizedLength: sanitizedText.length,
        userId: user._id.toString(),
        username: user.username,
      });

      // ✅ ИСПРАВЛЕНО: Детальная обработка ошибок БД
      let message;
      try {
        message = new Message({
          senderId: user._id,
          username: user.username,
          text: sanitizedText,
          timestamp: new Date(),
        });

        // ✅ НОВОЕ: Логируем данные перед сохранением
        socketLogger.debug("Message object created", {
          senderId: message.senderId,
          username: message.username,
          textLength: message.text.length,
        });

        await message.save();

        socketLogger.info("Message saved to database", {
          messageId: message._id.toString(),
        });
      } catch (dbError) {
        // ✅ ИСПРАВЛЕНО: Детальное логирование ошибки БД
        socketLogger.error("Database error while saving message", {
          errorMessage: dbError.message,
          errorName: dbError.name,
          errorCode: dbError.code,
          errorStack: dbError.stack,
          // ✅ НОВОЕ: Логируем детали валидации
          validationErrors: dbError.errors
            ? Object.keys(dbError.errors).map((key) => ({
                field: key,
                message: dbError.errors[key].message,
                kind: dbError.errors[key].kind,
              }))
            : null,
          // ✅ НОВОЕ: Логируем данные которые пытались сохранить
          attemptedData: {
            senderId: user._id.toString(),
            username: user.username,
            textLength: sanitizedText.length,
            text: sanitizedText.substring(0, 100), // Первые 100 символов
          },
        });

        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Failed to save message",
          code: ERROR_CODES.MESSAGE_SEND_FAILED,
          // ✅ В development отправляем детали
          ...(process.env.NODE_ENV === "development" && {
            details: dbError.message,
          }),
        });
        return;
      }

      // Broadcast нового сообщения
      const messageData = {
        _id: message._id,
        senderId: message.senderId,
        username: message.username,
        text: message.text,
        timestamp: message.timestamp,
      };

      io.emit(SOCKET_EVENTS.MESSAGE_NEW, messageData);

      socketLogger.info("Message broadcasted", {
        messageId: message._id.toString(),
        recipientsCount: io.sockets.sockets.size,
      });
    } catch (error) {
      socketLogger.error("Message send error", {
        error: error.message,
        stack: error.stack,
        name: error.name,
        userId: socket.user?._id?.toString(),
      });

      socket.emit(SOCKET_EVENTS.ERROR, {
        message: "Failed to send message",
        code: ERROR_CODES.MESSAGE_SEND_FAILED,
        ...(process.env.NODE_ENV === "development" && {
          details: error.message,
        }),
      });
    }
  }

  handleTypingStart(io, socket, socketLogger) {
    const user = socket.user;

    const existing = this.typingUsers.get(socket.id);
    if (existing?.timeoutId) {
      this.clearManagedTimeout(existing.timeoutId);
    }

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

  cleanupSocketResources(socketId) {
    const typingData = this.typingUsers.get(socketId);
    if (typingData?.timeoutId) {
      this.clearManagedTimeout(typingData.timeoutId);
      this.typingUsers.delete(socketId);
    }

    this.messageRateLimiter.delete(socketId);
  }

  async handleDisconnect(io, socket, reason, socketLogger) {
    const user = socket.user;
    const userId = user._id.toString();

    socketLogger.info("User disconnected", { reason });

    this.cleanupSocketResources(socket.id);

    try {
      await User.findByIdAndUpdate(
        user._id,
        {
          isOnline: false,
          lastSeen: Date.now(),
          socketId: null,
        },
        { new: true }
      );

      this.connectedUsers.delete(userId);

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
    io.use((socket, next) => this.authenticateSocket(socket, next));

    io.on(SOCKET_EVENTS.CONNECT, (socket) => this.handleConnection(io, socket));

    logger.info("Socket.IO initialized");
  }

  cleanup() {
    logger.info("Cleaning up socket manager resources");

    this.activeTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.activeTimeouts.clear();

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

process.on("SIGTERM", () => socketManager.cleanup());
process.on("SIGINT", () => socketManager.cleanup());

export default (io) => socketManager.initialize(io);
