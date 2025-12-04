import { useState, useEffect, useCallback } from 'react';
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

    // Обработчик истории сообщений
    const handleMessagesHistory = useCallback((history) => {
        setMessages(history);
        logger.debug('Messages history loaded', { count: history.length });
    }, []);

    // Обработчик нового сообщения
    const handleNewMessage = useCallback((message) => {
        setMessages((prev) => {
            // Проверка на дубликаты
            if (prev.some(m => m._id === message._id)) {
                return prev;
            }
            return [...prev, message];
        });
    }, []);

    // Обработчик онлайн пользователей
    const handleOnlineUsers = useCallback((users) => {
        setOnlineUsers(users);
        logger.debug('Online users updated', { count: users.length });
    }, []);

    // Обработчик подключения
    const handleConnect = useCallback(() => {
        setIsConnected(true);
        logger.info('Socket connected');
    }, []);

    // Обработчик отключения
    const handleDisconnect = useCallback(() => {
        setIsConnected(false);
        logger.warn('Socket disconnected');
    }, []);

    // Обработчик ошибок
    const handleError = useCallback((error) => {
        logger.error('Socket error', error);
    }, []);

    useEffect(() => {
        // Подписка на события
        socketService.on('connect', handleConnect);
        socketService.on('disconnect', handleDisconnect);
        socketService.on('messages:history', handleMessagesHistory);
        socketService.on('message:new', handleNewMessage);
        socketService.on('users:online', handleOnlineUsers);
        socketService.on('error', handleError);

        return () => {
            // Отписка от событий
            socketService.off('connect', handleConnect);
            socketService.off('disconnect', handleDisconnect);
            socketService.off('messages:history', handleMessagesHistory);
            socketService.off('message:new', handleNewMessage);
            socketService.off('users:online', handleOnlineUsers);
            socketService.off('error', handleError);
        };
    }, [
        handleConnect,
        handleDisconnect,
        handleMessagesHistory,
        handleNewMessage,
        handleOnlineUsers,
        handleError,
    ]);

    // Отправка сообщения с оптимистичным обновлением
    const sendMessage = useCallback((text) => {
        if (!text || !text.trim()) return;

        const trimmedText = text.trim();

        if (trimmedText.length > 2000) {
            logger.warn('Message too long');
            return;
        }

        socketService.emit('message:send', { text: trimmedText });
    }, []);

    return (
        <div className="chat-container">
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