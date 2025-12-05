// frontend/src/services/socket.js
import { io } from "socket.io-client";
import logger from "../utils/logger";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.connectionPromise = null; // ✅ НОВОЕ: Promise для отслеживания подключения
  }

  // ✅ НОВОЕ: Возвращает Promise, который резолвится при подключении
  connect(token) {
    if (this.socket?.connected) {
      logger.warn("Socket already connected");
      return Promise.resolve();
    }

    logger.info("Connecting to socket server", { url: SOCKET_URL });

    // ✅ Создаём Promise для отслеживания подключения
    this.connectionPromise = new Promise((resolve, reject) => {
      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      // ✅ Резолвим Promise при успешном подключении
      const onConnect = () => {
        logger.info("Socket connected successfully", { id: this.socket.id });
        this.reconnectAttempts = 0;
        this.socket.off("connect", onConnect);
        this.socket.off("connect_error", onError);
        resolve();
      };

      // ✅ Реджектим Promise при ошибке
      const onError = (error) => {
        logger.error("Socket connection error", { error: error.message });
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error("Max reconnection attempts reached");
          this.socket.off("connect", onConnect);
          this.socket.off("connect_error", onError);
          reject(new Error("Failed to connect to socket server"));
        }
      };

      this.socket.once("connect", onConnect);
      this.socket.on("connect_error", onError);

      // ✅ Timeout на случай зависания
      setTimeout(() => {
        if (!this.socket?.connected) {
          logger.warn("Socket connection timeout");
          this.socket.off("connect", onConnect);
          this.socket.off("connect_error", onError);
          resolve(); // Резолвим, но подключения нет (обработается позже)
        }
      }, 10000);
    });

    this.setupEventListeners();
    return this.connectionPromise;
  }

  setupEventListeners() {
    if (!this.socket) return;

    // ✅ Убираем дублирующиеся обработчики connect/connect_error
    // (они уже установлены в connect())

    this.socket.on("disconnect", (reason) => {
      logger.warn("Socket disconnected", { reason });
    });

    this.socket.on("error", (error) => {
      logger.error("Socket error", { error });
    });

    this.socket.io.on("reconnect_attempt", (attempt) => {
      logger.info("Reconnection attempt", { attempt });
    });

    this.socket.io.on("reconnect", (attempt) => {
      logger.info("Successfully reconnected", { attempt });
      this.reconnectAttempts = 0;
    });

    this.socket.io.on("reconnect_failed", () => {
      logger.error("Reconnection failed");
    });
  }

  disconnect() {
    if (this.socket) {
      logger.info("Disconnecting socket");
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
    }
  }

  on(event, callback) {
    if (!this.socket) {
      logger.warn("Socket not initialized", { event });
      return;
    }

    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  emit(event, data) {
    if (!this.socket) {
      logger.warn("Socket not initialized, cannot emit", { event });
      return;
    }

    if (!this.socket.connected) {
      logger.warn("Socket not connected, cannot emit", { event });
      return;
    }

    this.socket.emit(event, data);
    logger.debug("Event emitted", { event, data });
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  getSocket() {
    return this.socket;
  }

  // ✅ НОВОЕ: Метод для ожидания подключения
  waitForConnection() {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    return Promise.reject(new Error("Socket not connecting"));
  }
}

export default new SocketService();
