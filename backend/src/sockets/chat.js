import Message from "../models/Message.js";
import User from "../models/User.js";
import { verifyToken } from "../utils/token.js";
import logger from "../config/logger.js";
import DOMPurify from "isomorphic-dompurify";

class SocketManager {
  constructor() {
    this.connectedUsers = new Map(); // userId -> socketId
    this.typingUsers = new Map(); // socketId -> { username, timeoutId }
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        logger.warn("Socket authentication failed: no token");
        return next(new Error("Authentication error: Token required"));
      }

      const decoded = verifyToken(token);

      if (!decoded || !decoded.userId) {
        logger.warn("Socket authentication failed: invalid token");
        return next(new Error("Authentication error: Invalid token"));
      }

      const user = await User.findById(decoded.userId)
        .select("-password -resetPasswordToken -resetPasswordExpires")
        .lean();

      if (!user) {
        logger.warn("Socket authentication failed: user not found", {
          userId: decoded.userId,
        });
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      logger.error("Socket authentication error", { error: error.message });
      next(new Error("Authentication error"));
    }
  }

  async handleConnection(io, socket) {
    const user = socket.user;
    const userId = user._id.toString();

    logger.info("User connected", {
      username: user.username,
      socketId: socket.id,
      userId,
    });

    // Отключаем предыдущее соединение если есть
    const existingSocketId = this.connectedUsers.get(userId);
    if (existingSocketId && existingSocketId !== socket.id) {
      const existingSocket = io.sockets.sockets.get(existingSocketId);
      if (existingSocket) {
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

    // Отправляем историю сообщений (последние 50)
    try {
      const recentMessages = await Message.getRecent(50);
      socket.emit("messages:history", recentMessages);
    } catch (error) {
      logger.error("Failed to load message history", { error: error.message });
    }

    // Обработчик отправки сообщения
    socket.on("message:send", async (data) => {
      await this.handleMessageSend(io, socket, data);
    });

    // Обработчик начала набора
    socket.on("typing:start", () => {
      this.handleTypingStart(socket);
    });

    // Обработчик окончания набора
    socket.on("typing:stop", () => {
      this.handleTypingStop(socket);
    });

    // Обработчик отключения
    socket.on("disconnect", async () => {
      await this.handleDisconnect(io, socket);
    });
  }

  async handleMessageSend(io, socket, data) {
    try {
      const user = socket.user;

      // Валидация
      if (!data || !data.text || typeof data.text !== "string") {
        return socket.emit("error", {
          message: "Invalid message format",
        });
      }

      const text = data.text.trim();

      if (!text || text.length === 0) {
        return socket.emit("error", {
          message: "Message cannot be empty",
        });
      }

      if (text.length > 2000) {
        return socket.emit("error", {
          message: "Message too long (max 2000 characters)",
        });
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

      logger.debug("Message sent", {
        username: user.username,
        messageId: message._id,
      });
    } catch (error) {
      logger.error("Message send error", {
        error: error.message,
        username: socket.user?.username,
      });

      socket.emit("error", {
        message: "Failed to send message",
      });
    }
  }

  handleTypingStart(socket) {
    const user = socket.user;

    // Очищаем предыдущий таймаут если есть
    const existing = this.typingUsers.get(socket.id);
    if (existing && existing.timeoutId) {
      clearTimeout(existing.timeoutId);
    }

    // Устанавливаем новый таймаут (автоматическая остановка через 3 сек)
    const timeoutId = setTimeout(() => {
      this.handleTypingStop(socket);
    }, 3000);

    this.typingUsers.set(socket.id, {
      username: user.username,
      timeoutId,
    });

    socket.broadcast.emit("user:typing", {
      username: user.username,
    });
  }

  handleTypingStop(socket) {
    const user = socket.user;
    const existing = this.typingUsers.get(socket.id);

    if (existing) {
      if (existing.timeoutId) {
        clearTimeout(existing.timeoutId);
      }
      this.typingUsers.delete(socket.id);
    }

    socket.broadcast.emit("user:stopped-typing", {
      username: user.username,
    });
  }

  async handleDisconnect(io, socket) {
    const user = socket.user;
    const userId = user._id.toString();

    logger.info("User disconnected", {
      username: user.username,
      socketId: socket.id,
    });

    // Очищаем typing если был активен
    this.handleTypingStop(socket);

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
  }

  async broadcastOnlineUsers(io) {
    try {
      const onlineUsers = await User.getOnlineUsers();
      io.emit("users:online", onlineUsers);
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

  // Очистка при shutdown
  cleanup() {
    this.typingUsers.forEach((value) => {
      if (value.timeoutId) {
        clearTimeout(value.timeoutId);
      }
    });
    this.typingUsers.clear();
    this.connectedUsers.clear();
  }
}

const socketManager = new SocketManager();

// Очистка при завершении процесса
process.on("SIGTERM", () => socketManager.cleanup());
process.on("SIGINT", () => socketManager.cleanup());

export default (io) => socketManager.initialize(io);
