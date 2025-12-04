import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import LeftSidebar from '../components/layout/LeftSidebar';
import RightSidebar from '../components/layout/RightSidebar';
import ChatArea from '../components/chat/ChatArea';
import socketService from '../services/socket';

const Chat = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);

    useEffect(() => {
        socketService.on('messages:history', (history) => {
            setMessages(history);
        });

        socketService.on('message:new', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        socketService.on('users:online', (users) => {
            setOnlineUsers(users);
        });

        return () => {
            socketService.off('messages:history');
            socketService.off('message:new');
            socketService.off('users:online');
        };
    }, []);

    const sendMessage = (text) => {
        if (text.trim()) {
            socketService.emit('message:send', { text });
        }
    };

    return (
        <div className="chat-container">
            <LeftSidebar users={onlineUsers} currentUser={user} />
            <ChatArea messages={messages} onSendMessage={sendMessage} currentUser={user} />
            <RightSidebar user={user} />
        </div>
    );
};

export default Chat;