import { useEffect, useRef } from 'react';

const MessageList = ({ messages, currentUser }) => {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="message-list">
            {messages.length === 0 ? (
                <div className="text-center text-muted p-4">
                    <i className="bi bi-chat-text" style={{ fontSize: '3rem' }}></i>
                    <p className="mt-3">Нет сообщений. Начните общение!</p>
                </div>
            ) : (
                messages.map((message) => {
                    const isOwn = message.senderId === currentUser?._id;
                    return (
                        <div
                            key={message._id}
                            className={`message ${isOwn ? 'message-own' : 'message-other'}`}
                        >
                            <div className="message-content">
                                {!isOwn && (
                                    <div className="message-username">{message.username}</div>
                                )}
                                <div className="message-text">{message.text}</div>
                                <div className="message-time">{formatTime(message.timestamp)}</div>
                            </div>
                        </div>
                    );
                })
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;