import { useEffect, useRef, memo, useCallback } from 'react';
import { formatTime } from '../../utils/helpers';

// Мемоизированный компонент сообщения
const Message = memo(
    ({ message, isOwn, showAvatar }) => {
        return (
            <div className={`message-wrapper ${isOwn ? 'message-own' : 'message-other'}`}>
                {/* Avatar (только для чужих сообщений) */}
                {!isOwn && showAvatar && (
                    <div className="message-avatar">
                        <div className="avatar-circle">
                            {message.username.charAt(0).toUpperCase()}
                        </div>
                    </div>
                )}

                {/* Message Bubble */}
                <div className="message-bubble">
                    {/* Username (только для чужих сообщений и первого в группе) */}
                    {!isOwn && showAvatar && (
                        <div className="message-username">{message.username}</div>
                    )}

                    {/* Text */}
                    <div className="message-text">{message.text}</div>

                    {/* Footer */}
                    <div className="message-footer">
                        <span className="message-time">{formatTime(message.timestamp)}</span>
                        {message.edited && (
                            <span className="message-edited">
                                <i className="bi bi-pencil-fill"></i>
                                изменено
                            </span>
                        )}
                        {isOwn && (
                            <span className="message-status">
                                <i className="bi bi-check-all"></i>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    },
    (prevProps, nextProps) => {
        return (
            prevProps.message._id === nextProps.message._id &&
            prevProps.message.text === nextProps.message.text &&
            prevProps.message.edited === nextProps.message.edited &&
            prevProps.isOwn === nextProps.isOwn &&
            prevProps.showAvatar === nextProps.showAvatar
        );
    }
);

Message.displayName = 'Message';

// Компонент разделителя дат
const DateDivider = memo(({ date }) => {
    const formatDate = (timestamp) => {
        const messageDate = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (messageDate.toDateString() === today.toDateString()) {
            return 'Сегодня';
        } else if (messageDate.toDateString() === yesterday.toDateString()) {
            return 'Вчера';
        } else {
            return messageDate.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    };

    return (
        <div className="date-divider">
            <span className="date-divider-text">{formatDate(date)}</span>
        </div>
    );
});

DateDivider.displayName = 'DateDivider';

const MessageList = memo(({ messages, currentUser }) => {
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const prevScrollHeight = useRef(0);
    const isUserAtBottom = useRef(true);
    const scrollTimeoutRef = useRef(null);

    // Проверка, находится ли пользователь внизу списка
    const checkIfAtBottom = useCallback(() => {
        if (!messagesContainerRef.current) return true;

        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const threshold = 100;

        return scrollHeight - scrollTop - clientHeight < threshold;
    }, []);

    // Обработчик скролла с debounce
    const handleScroll = useCallback(() => {
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            isUserAtBottom.current = checkIfAtBottom();
        }, 100);
    }, [checkIfAtBottom]);

    // Автоскролл при новых сообщениях
    useEffect(() => {
        if (isUserAtBottom.current && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'end',
            });
        }
    }, [messages]);

    // Сохранение позиции скролла при загрузке старых сообщений
    useEffect(() => {
        const container = messagesContainerRef.current;

        if (container) {
            const newScrollHeight = container.scrollHeight;

            if (prevScrollHeight.current > 0 && newScrollHeight > prevScrollHeight.current) {
                const scrollDiff = newScrollHeight - prevScrollHeight.current;
                container.scrollTop += scrollDiff;
            }

            prevScrollHeight.current = newScrollHeight;
        }
    }, [messages.length]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // Добавление и удаление scroll listener
    useEffect(() => {
        const container = messagesContainerRef.current;

        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    // Группировка сообщений по датам и определение показа аватара
    const groupedMessages = messages.reduce((acc, message, index) => {
        const messageDate = new Date(message.timestamp).toDateString();

        if (!acc.length || acc[acc.length - 1].date !== messageDate) {
            acc.push({ date: messageDate, messages: [] });
        }

        const isOwn = message.senderId === currentUser?._id;
        const prevMessage = messages[index - 1];

        // Показываем аватар, если:
        // - Первое сообщение в списке
        // - Сообщение от другого пользователя
        // - Прошло более 5 минут с предыдущего сообщения
        const showAvatar = !prevMessage ||
            prevMessage.senderId !== message.senderId ||
            (new Date(message.timestamp) - new Date(prevMessage.timestamp)) > 300000;

        acc[acc.length - 1].messages.push({
            ...message,
            isOwn,
            showAvatar: !isOwn && showAvatar
        });

        return acc;
    }, []);

    return (
        <div className="message-list" ref={messagesContainerRef}>
            {groupedMessages.map((group, groupIndex) => (
                <div key={groupIndex}>
                    <DateDivider date={group.date} />
                    {group.messages.map((message) => (
                        <Message
                            key={message._id}
                            message={message}
                            isOwn={message.isOwn}
                            showAvatar={message.showAvatar}
                        />
                    ))}
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
});

MessageList.displayName = 'MessageList';

export default MessageList;