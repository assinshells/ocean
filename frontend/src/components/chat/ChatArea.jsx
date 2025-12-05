// frontend/src/components/chat/ChatArea.jsx
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

const ChatArea = ({ messages, onSendMessage, currentUser, isConnected, typingUsers = [] }) => {
    return (
        <div className="chat-area">
            <ChatHeader isConnected={isConnected} />
            <MessageList messages={messages} currentUser={currentUser} />
            {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
            <ChatInput onSendMessage={onSendMessage} isConnected={isConnected} />
        </div>
    );
};

export default ChatArea;