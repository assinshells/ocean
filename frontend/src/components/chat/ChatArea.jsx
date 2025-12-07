// frontend/src/components/chat/ChatArea.jsx
import { memo } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

const ChatArea = memo(({ messages, onSendMessage, currentUser, isConnected, typingUsers = [] }) => {
    return (
        <div className="user-chat w-100 overflow-hidden">
            <div className="d-lg-flex">
                <div className="w-100 overflow-hidden position-relative">
                    <ChatHeader isConnected={isConnected} />
                    <div className="chat-conversation p-3 p-lg-4">
                        <MessageList messages={messages} currentUser={currentUser} />
                        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
                        <ChatInput onSendMessage={onSendMessage} isConnected={isConnected} />
                    </div>

                </div>
            </div>
        </div>
    );
});

ChatArea.displayName = 'ChatArea';

export default ChatArea;