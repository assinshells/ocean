// frontend/src/pages/Chat.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import LeftSidebar from "../components/layout/LeftSidebar";
import RightSidebar from "../components/layout/RightSidebar";
import ChatArea from "../components/chat/ChatArea";
import socketService from "../services/socket";
import logger from "../utils/logger";

const Chat = () => {
  const navigate = useNavigate();
  const { user, logout, socketConnected } = useAuth();

  // State
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightOpenMobile, setRightOpenMobile] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());

  const errorTimeoutRef = useRef(null);

  // Logout handler
  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  // Logging state changes
  useEffect(() => {
    logger.info("Chat state updated", {
      user: user?.username,
      socketConnected,
      messagesCount: messages.length,
      onlineUsersCount: onlineUsers.length
    });
  }, [user, socketConnected, messages.length, onlineUsers.length]);

  // Error handler
  const showError = useCallback((errorMessage, duration = 5000) => {
    setError(errorMessage);

    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }

    errorTimeoutRef.current = setTimeout(() => {
      setError(null);
    }, duration);
  }, []);

  // Socket event handlers
  const socketHandlers = useMemo(
    () => ({
      connect: () => {
        logger.info("Socket connected in Chat");
      },

      disconnect: () => {
        logger.warn("Socket disconnected in Chat");
      },

      "messages:history": (history) => {
        if (Array.isArray(history)) {
          setMessages(history);
          logger.debug("Messages history loaded", { count: history.length });
        }
      },

      "message:new": (message) => {
        if (!message?._id) {
          logger.warn("Invalid message received", { message });
          return;
        }

        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) {
            return prev;
          }
          return [...prev, message];
        });

        logger.debug("New message added", {
          messageId: message._id,
          from: message.username
        });
      },

      "users:online": (users) => {
        if (Array.isArray(users)) {
          setOnlineUsers(users);
          logger.debug("Online users updated", { count: users.length });
        }
      },

      "user:typing": ({ username }) => {
        setTypingUsers((prev) => new Set(prev).add(username));

        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(username);
            return next;
          });
        }, 3000);
      },

      "user:stopped-typing": ({ username }) => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(username);
          return next;
        });
      },

      error: (errorData) => {
        logger.error("Socket error", errorData);
        showError(errorData?.message || "Произошла ошибка");
      },
    }),
    [showError]
  );

  // Setup socket listeners
  useEffect(() => {
    Object.entries(socketHandlers).forEach(([event, handler]) => {
      socketService.on(event, handler);
    });

    return () => {
      Object.entries(socketHandlers).forEach(([event, handler]) => {
        socketService.off(event, handler);
      });

      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [socketHandlers]);

  // Send message handler
  const sendMessage = useCallback(
    async (text) => {
      if (!text?.trim()) {
        logger.warn("Attempted to send empty message");
        showError("Сообщение не может быть пустым", 3000);
        throw new Error("Empty message");
      }

      const trimmedText = text.trim();

      if (trimmedText.length > 2000) {
        logger.warn("Message too long", { length: trimmedText.length });
        showError("Сообщение слишком длинное (макс. 2000 символов)", 3000);
        throw new Error("Message too long");
      }

      if (!socketConnected) {
        logger.error("Cannot send message: socket not connected", {
          socketConnected,
          socketExists: !!socketService.getSocket(),
          socketId: socketService.getSocket()?.id
        });
        showError("Нет подключения к серверу. Проверьте соединение.", 3000);
        throw new Error("Not connected");
      }

      if (!user) {
        logger.error("Cannot send message: user not authenticated");
        showError("Необходимо авторизоваться", 3000);
        throw new Error("Not authenticated");
      }

      try {
        logger.info("Sending message", {
          textLength: trimmedText.length,
          socketId: socketService.getSocket()?.id,
          username: user.username
        });

        const emitted = socketService.emit("message:send", { text: trimmedText });

        if (emitted) {
          logger.debug("Message sent successfully");
        } else {
          logger.error("Failed to emit message - socket not ready");
          throw new Error("Socket not ready");
        }
      } catch (err) {
        logger.error("Failed to send message", {
          error: err.message,
          stack: err.stack
        });
        showError("Не удалось отправить сообщение", 3000);
        throw err;
      }
    },
    [socketConnected, user, showError]
  );

  // Toggle right sidebar on mobile
  const toggleRightSidebar = useCallback((state) => {
    if (typeof state === 'boolean') {
      setRightOpenMobile(state);
    } else {
      setRightOpenMobile(prev => !prev);
    }
  }, []);

  // Convert Set to Array for typing users
  const typingUsersArray = useMemo(() => Array.from(typingUsers), [typingUsers]);

  // Show connection warning
  useEffect(() => {
    if (user && !socketConnected) {
      const timeoutId = setTimeout(() => {
        if (!socketConnected) {
          showError("Нет подключения к серверу. Попробуйте обновить страницу.", 10000);
        }
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [user, socketConnected, showError]);

  return (
    <div className="layout-wrapper d-lg-flex">
      {/* Error notification */}
      {error && (
        <div
          className="position-fixed top-0 start-50 translate-middle-x mt-3"
          style={{ zIndex: 9999, maxWidth: '90%', width: '500px' }}
        >
          <div
            className="alert alert-danger alert-dismissible fade show shadow-sm"
            role="alert"
          >
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError(null)}
              aria-label="Close"
            ></button>
          </div>
        </div>
      )}
      {/* Left Sidebar */}
      <LeftSidebar
        collapsed={leftCollapsed}
        onToggleCollapse={setLeftCollapsed}
        handleLogout={handleLogout}
        currentUser={user}
      />
      {/* Main Content */}
      <ChatArea
        messages={messages}
        onSendMessage={sendMessage}
        currentUser={user}
        isConnected={socketConnected}
        typingUsers={typingUsersArray}
      />
      {/* Right Sidebar */}
      <RightSidebar
        users={onlineUsers}
        currentUser={user}
        isOpen={rightOpenMobile}
        onClose={() => toggleRightSidebar(false)}
      />
    </div>
  );
};

export default Chat;