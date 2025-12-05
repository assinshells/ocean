// frontend/src/pages/Chat.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import LeftSidebar from "../components/layout/LeftSidebar";
import RightSidebar from "../components/layout/RightSidebar";
import ChatArea from "../components/chat/ChatArea";
import socketService from "../services/socket";
import logger from "../utils/logger";

const Chat = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [typingUsers, setTypingUsers] = useState(new Set());

    // Таймер для автоскрытия ошибок
    const errorTimeoutRef = useRef(null);

    // Функция для показа ошибки с автоскрытием
    const showError = useCallback((errorMessage, duration = 5000) => {
        setError(errorMessage);

        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
        }

        errorTimeoutRef.current = setTimeout(() => {
            setError(null);
        }, duration);
    }, []);

    // Мемоизированные обработчики событий
    const socketHandlers = useMemo(
        () => ({
            connect: () => {
                setIsConnected(true);
                setError(null);
                logger.info("Socket connected");
            },

            disconnect: () => {
                setIsConnected(false);
                logger.warn("Socket disconnected");
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
                    // Проверка на дубликаты
                    if (prev.some((m) => m._id === message._id)) {
                        return prev;
                    }
                    return [...prev, message];
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

                // Автоматически убираем через 3 секунды (fallback)
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

    // Единая подписка на все события сокета
    useEffect(() => {
        // Подписываемся на события
        Object.entries(socketHandlers).forEach(([event, handler]) => {
            socketService.on(event, handler);
        });

        // Проверяем начальное состояние
        setIsConnected(socketService.isConnected());

        // Отписываемся при размонтировании
        return () => {
            Object.entries(socketHandlers).forEach(([event, handler]) => {
                socketService.off(event, handler);
            });

            // Очищаем таймер ошибок
            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
            }
        };
    }, [socketHandlers]);

    // Отправка сообщения
    const sendMessage = useCallback(
        async (text) => {
            if (!text?.trim()) {
                logger.warn("Attempted to send empty message");
                return;
            }

            const trimmedText = text.trim();

            if (trimmedText.length > 2000) {
                logger.warn("Message too long", { length: trimmedText.length });
                showError("Сообщение слишком длинное (макс. 2000 символов)", 3000);
                throw new Error("Message too long");
            }
            if (!isConnected) {
                logger.warn("Cannot send message: not connected");
                showError("Нет подключения к серверу", 3000);
                throw new Error("Not connected");
            }

            try {
                socketService.emit("message:send", { text: trimmedText });
                logger.debug("Message sent", { length: trimmedText.length });
            } catch (err) {
                logger.error("Failed to send message", { error: err.message });
                showError("Не удалось отправить сообщение", 3000);
                throw err;
            }
        },
        [isConnected, showError]
    );
    // Мемоизированный список печатающих пользователей
    const typingUsersArray = useMemo(
        () => Array.from(typingUsers),
        [typingUsers]
    );
    return (
        <div className="chat-container">
            {error && (
                <div
                    className="position-fixed top-0 start-50 translate-middle-x mt-3"
                    style={{ zIndex: 9999 }}
                >
                    <div
                        className="alert alert-danger alert-dismissible fade show"
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
            <LeftSidebar users={onlineUsers} currentUser={user} />
            <ChatArea
                messages={messages}
                onSendMessage={sendMessage}
                currentUser={user}
                isConnected={isConnected}
                typingUsers={typingUsersArray}
            />
            <RightSidebar user={user} />
        </div>
    );
};
export default Chat;