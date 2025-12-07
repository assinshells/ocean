import { useEffect, useRef, memo, useCallback } from 'react';
import { formatTime } from '../../utils/helpers';

// Мемоизированный компонент сообщения
const Message = memo(
    ({ message, isOwn }) => {
        return (
            <div className={`message ${isOwn ? 'message-own' : 'message-other'}`}>
                <div className="message-content">
                    {!isOwn && (
                        <div className="message-username">{message.username}</div>
                    )}
                    <div className="message-text">{message.text}</div>
                    <div className="message-time">
                        {formatTime(message.timestamp)}
                        {message.edited && (
                            <span className="ms-1 text-muted">(изменено)</span>
                        )}
                    </div>
                </div>
            </div>
        );
    },
    (prevProps, nextProps) => {
        // Custom comparison для оптимизации
        return (
            prevProps.message._id === nextProps.message._id &&
            prevProps.message.text === nextProps.message.text &&
            prevProps.message.edited === nextProps.message.edited &&
            prevProps.isOwn === nextProps.isOwn
        );
    }
);

Message.displayName = 'Message';

const MessageList = memo(({ messages, currentUser }) => {
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const prevScrollHeight = useRef(0);
    const isUserAtBottom = useRef(true);
    const scrollTimeoutRef = useRef(null);

    // Проверка, находится ли пользователь внизу списка
    const checkIfAtBottom = useCallback(() => {
        if (!messagesContainerRef.current) return true;

        const { scrollTop, scrollHeight, clientHeight } =
            messagesContainerRef.current;
        const threshold = 100; // px от низа

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

    // Cleanup scroll timeout
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

            return () => {
                container.removeEventListener('scroll', handleScroll);
            };
        }
    }, [handleScroll]);

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
        <>
            <ul className="list-unstyled mb-0" ref={messagesContainerRef}>
                <li>
                    {messages.map((message) => (
                        <Message
                            key={message._id}
                            message={message}
                            isOwn={message.senderId === currentUser?._id}
                        />
                    ))}
                </li>
                <div ref={messagesEndRef} />
            </ul>
        </>
    );
});

MessageList.displayName = 'MessageList';

export default MessageList;