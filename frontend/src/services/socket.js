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
    this.connectionPromise = null;
  }

  connect(token) {
    if (this.socket?.connected) {
      logger.warn("Socket already connected", { id: this.socket.id });
      return Promise.resolve();
    }

    logger.info("Connecting to socket server", {
      url: SOCKET_URL,
      hasToken: !!token,
    });

    // ✅ НОВОЕ: Проверяем наличие токена
    if (!token) {
      logger.error("Cannot connect: no token provided");
      return Promise.reject(new Error("No token provided"));
    }

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

      const onConnect = () => {
        logger.info("Socket connected successfully", {
          id: this.socket.id,
          transport: this.socket.io.engine.transport.name,
        });
        this.reconnectAttempts = 0;
        this.socket.off("connect", onConnect);
        this.socket.off("connect_error", onError);
        resolve();
      };

      const onError = (error) => {
        logger.error("Socket connection error", {
          error: error.message,
          type: error.type,
          description: error.description,
        });
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

      setTimeout(() => {
        if (!this.socket?.connected) {
          logger.warn("Socket connection timeout");
          this.socket.off("connect", onConnect);
          this.socket.off("connect_error", onError);
          resolve();
        }
      }, 10000);
    });

    this.setupEventListeners();
    return this.connectionPromise;
  }

  setupEventListeners() {
    if (!this.socket) return;

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

    // ✅ НОВОЕ: Логируем все входящие события в development
    if (import.meta.env.DEV) {
      const originalOnevent = this.socket.onevent;
      this.socket.onevent = function (packet) {
        logger.debug("Socket event received", {
          event: packet.data[0],
          hasData: packet.data.length > 1,
        });
        originalOnevent.call(this, packet);
      };
    }
  }

  disconnect() {
    if (this.socket) {
      logger.info("Disconnecting socket", { id: this.socket.id });
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
    }
  }

  on(event, callback) {
    if (!this.socket) {
      logger.warn("Socket not initialized, cannot add listener", { event });
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
      logger.error("Socket not initialized, cannot emit", { event });
      return false;
    }

    if (!this.socket.connected) {
      logger.error("Socket not connected, cannot emit", {
        event,
        socketId: this.socket.id,
        readyState: this.socket.io?.engine?.readyState,
      });
      return false;
    }

    try {
      this.socket.emit(event, data);
      logger.debug("Event emitted", {
        event,
        dataSize: JSON.stringify(data || {}).length,
      });
      return true;
    } catch (error) {
      logger.error("Failed to emit event", {
        event,
        error: error.message,
      });
      return false;
    }
  }

  isConnected() {
    const connected = this.socket?.connected || false;

    // ✅ НОВОЕ: Дополнительная проверка состояния
    if (this.socket && !connected) {
      logger.debug("Socket exists but not connected", {
        socketId: this.socket.id,
        readyState: this.socket.io?.engine?.readyState,
        transport: this.socket.io?.engine?.transport?.name,
      });
    }

    return connected;
  }

  getSocket() {
    return this.socket;
  }

  waitForConnection() {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    return Promise.reject(new Error("Socket not connecting"));
  }

  // ✅ НОВОЕ: Метод для получения полной диагностики
  getDiagnostics() {
    if (!this.socket) {
      return { error: "Socket not initialized" };
    }

    return {
      connected: this.socket.connected,
      id: this.socket.id,
      transport: this.socket.io?.engine?.transport?.name,
      readyState: this.socket.io?.engine?.readyState,
      reconnectAttempts: this.reconnectAttempts,
      hasToken: !!this.socket.auth?.token,
      url: SOCKET_URL,
    };
  }
}

export default new SocketService();
