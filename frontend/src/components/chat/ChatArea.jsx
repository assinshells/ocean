import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

const ChatArea = ({ messages, onSendMessage, currentUser }) => {
    return (
        <div className="chat-area">
            <ChatHeader />
            <MessageList messages={messages} currentUser={currentUser} />
            <ChatInput onSendMessage={onSendMessage} />
        </div>
    );
};

export default ChatArea;