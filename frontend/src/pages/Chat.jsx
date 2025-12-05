import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import LeftSidebar from '../components/layout/LeftSidebar';
import RightSidebar from '../components/layout/RightSidebar';
import ChatArea from '../components/chat/ChatArea';
import socketService from '../services/socket';
import logger from '../utils/logger';

const Chat = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    // Ref для хранения handler'ов чтобы правильно их удалять
    const handlersRef = useRef({});

    // Создаём стабильные handler'ы с useCallback
    const handleConnect = useCallback(() => {
        setIsConnected(true);
        setError(null);
        logger.info('Socket connected');
    }, []);

    const handleDisconnect = useCallback(() => {
        setIsConnected(false);
        logger.warn('Socket disconnected');
    }, []);

    const handleMessagesHistory = useCallback((history) => {
        if (Array.isArray(history)) {
            setMessages(history);
            logger.debug('Messages history loaded', { count: history.length });
        }
    }, []);

    const handleNewMessage = useCallback((message) => {
        if (!message || !message._id) {
            logger.warn('Invalid message received', { message });
            return;
        }

        setMessages((prev) => {
            // Проверка на дубликаты
            if (prev.some((m) => m._id === message._id)) {
                return prev;
            }
            return [...prev, message];
        });
    }, []);

    const handleOnlineUsers = useCallback((users) => {
        if (Array.isArray(users)) {
            setOnlineUsers(users);
            logger.debug('Online users updated', { count: users.length });
        }
    }, []);

    const handleError = useCallback((error) => {
        logger.error('Socket error', error);
        setError(error?.message || 'Произошла ошибка');

        // Автоматически скрываем ошибку через 5 секунд
        setTimeout(() => setError(null), 5000);
    }, []);

    // Сохраняем handlers в ref
    useEffect(() => {
        handlersRef.current = {
            connect: handleConnect,
            disconnect: handleDisconnect,
            'messages:history': handleMessagesHistory,
            'message:new': handleNewMessage,
            'users:online': handleOnlineUsers,
            error: handleError,
        };
    }, [
        handleConnect,
        handleDisconnect,
        handleMessagesHistory,
        handleNewMessage,
        handleOnlineUsers,
        handleError,
    ]);

    // Подписка на события - используем handlers из ref
    useEffect(() => {
        const handlers = handlersRef.current;

        // Подписываемся
        Object.entries(handlers).forEach(([event, handler]) => {
            socketService.on(event, handler);
        });

        // Проверяем начальное состояние подключения
        setIsConnected(socketService.isConnected());

        // Отписываемся при размонтировании
        return () => {
            Object.entries(handlers).forEach(([event, handler]) => {
                socketService.off(event, handler);
            });
        };
    }, []); // Пустой массив зависимостей - подписка происходит один раз

    // Отправка сообщения
    const sendMessage = useCallback(
        (text) => {
            if (!text || !text.trim()) {
                logger.warn('Attempted to send empty message');
                return Promise.resolve();
            }

            const trimmedText = text.trim();

            if (trimmedText.length > 2000) {
                logger.warn('Message too long', { length: trimmedText.length });
                setError('Сообщение слишком длинное (макс. 2000 символов)');
                setTimeout(() => setError(null), 3000);
                return Promise.reject(new Error('Message too long'));
            }

            if (!isConnected) {
                logger.warn('Cannot send message: not connected');
                setError('Нет подключения к серверу');
                setTimeout(() => setError(null), 3000);
                return Promise.reject(new Error('Not connected'));
            }

            return new Promise((resolve, reject) => {
                try {
                    socketService.emit('message:send', { text: trimmedText });
                    logger.debug('Message sent', { length: trimmedText.length });
                    resolve();
                } catch (err) {
                    logger.error('Failed to send message', { error: err.message });
                    setError('Не удалось отправить сообщение');
                    setTimeout(() => setError(null), 3000);
                    reject(err);
                }
            });
        },
        [isConnected]
    );

    return (
        <div className="chat-container">
            {error && (
                <div className="position-fixed top-0 start-50 translate-middle-x mt-3" style={{ zIndex: 9999 }}>
                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
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
            />
            <RightSidebar user={user} />
        </div>
    );
};

export default Chat;