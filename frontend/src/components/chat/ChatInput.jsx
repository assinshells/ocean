import { useState } from 'react';

const ChatInput = ({ onSendMessage }) => {
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="chat-input">
            <form onSubmit={handleSubmit} className="d-flex gap-2">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Введите сообщение..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                />
                <button type="submit" className="btn btn-primary" disabled={!message.trim()}>
                    <i className="bi bi-send-fill"></i>
                </button>
            </form>
        </div>
    );
};

export default ChatInput;