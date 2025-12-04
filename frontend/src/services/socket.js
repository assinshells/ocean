import { io } from "socket.io-client";
import logger from "../utils/logger";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(token) {
    if (this.socket?.connected) {
      logger.warn("Socket already connected");
      return;
    }

    logger.info("Connecting to socket server");

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      logger.info("Socket connected", { id: this.socket.id });
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      logger.warn("Socket disconnected", { reason });
    });

    this.socket.on("connect_error", (error) => {
      logger.error("Socket connection error", { error: error.message });
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error("Max reconnection attempts reached");
        this.disconnect();
      }
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
}

export default new SocketService();
