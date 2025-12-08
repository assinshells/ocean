// frontend/src/components/chat/ChatArea.jsx
import { memo } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

const ChatArea = memo(({ messages, onSendMessage, currentUser, isConnected, typingUsers = [] }) => {
    return (
        <div className="chat-area-wrapper">
            {/* Header */}
            <ChatHeader isConnected={isConnected} messagesCount={messages.length} />

            {/* Messages Container */}
            <div className="chat-messages-container">
                {messages.length === 0 ? (
                    <div className="chat-empty-state">
                        <div className="empty-icon">
                            <i className="bi bi-chat-heart"></i>
                        </div>
                        <h4>Добро пожаловать в чат!</h4>
                        <p className="text-muted">
                            Начните общение, отправив первое сообщение
                        </p>
                        <div className="empty-features">
                            <div className="feature-item">
                                <i className="bi bi-lightning-charge-fill text-primary"></i>
                                <span>Мгновенная доставка</span>
                            </div>
                            <div className="feature-item">
                                <i className="bi bi-shield-check text-success"></i>
                                <span>Безопасно</span>
                            </div>
                            <div className="feature-item">
                                <i className="bi bi-people-fill text-info"></i>
                                <span>Групповой чат</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <MessageList messages={messages} currentUser={currentUser} />
                )}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
            </div>

            {/* Input Area */}
            <div className="chat-input-wrapper">
                <ChatInput onSendMessage={onSendMessage} isConnected={isConnected} />
            </div>
        </div>
    );
});

ChatArea.displayName = 'ChatArea';

export default ChatArea;