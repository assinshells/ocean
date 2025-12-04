import { useEffect, useRef, memo } from 'react';
import { formatTime } from '../../utils/helpers';

// Мемоизированный компонент сообщения
const Message = memo(({ message, isOwn, currentUserId }) => {
    return (
        <div className={`message ${isOwn ? 'message-own' : 'message-other'}`}>
            <div className="message-content">
                {!isOwn && (
                    <div className="message-username">{message.username}</div>
                )}
                <div className="message-text">{message.text}</div>
                <div className="message-time">
                    {formatTime(message.timestamp)}
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison для оптимизации
    return (
        prevProps.message._id === nextProps.message._id &&
        prevProps.message.text === nextProps.message.text &&
        prevProps.message.edited === nextProps.message.edited
    );
});

Message.displayName = 'Message';

const MessageList = ({ messages, currentUser }) => {
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const prevScrollHeight = useRef(0);
    const isUserAtBottom = useRef(true);

    // Проверка, находится ли пользователь внизу списка
    const checkIfAtBottom = () => {
        if (!messagesContainerRef.current) return true;

        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const threshold = 100; // px от низа

        return scrollHeight - scrollTop - clientHeight < threshold;
    };

    // Обработчик скролла
    const handleScroll = () => {
        isUserAtBottom.current = checkIfAtBottom();
    };

    // Автоскролл при новых сообщениях
    useEffect(() => {
        if (isUserAtBottom.current && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Сохранение позиции скролла при загрузке старых сообщений
    useEffect(() => {
        if (messagesContainerRef.current) {
            const container = messagesContainerRef.current;
            const newScrollHeight = container.scrollHeight;

            if (prevScrollHeight.current > 0) {
                const scrollDiff = newScrollHeight - prevScrollHeight.current;
                container.scrollTop += scrollDiff;
            }

            prevScrollHeight.current = newScrollHeight;
        }
    }, [messages.length]);

    if (messages.length === 0) {
        return (
            <div className="message-list" ref={messagesContainerRef}>
                <div className="text-center text-muted p-4">
                    <i className="bi bi-chat-text" style={{ fontSize: '3rem' }}></i>
                    <p className="mt-3">Нет сообщений. Начните общение!</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="message-list"
            ref={messagesContainerRef}
            onScroll={handleScroll}
        >
            {messages.map((message) => (
                <Message
                    key={message._id}
                    message={message}
                    isOwn={message.senderId === currentUser?._id}
                    currentUserId={currentUser?._id}
                />
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default memo(MessageList);