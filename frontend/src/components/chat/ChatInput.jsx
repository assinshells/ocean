import { useState, useCallback, useRef, useEffect } from 'react';
import socketService from '../../services/socket';
import { debounce } from '../../utils/helpers';

const ChatInput = ({ onSendMessage, isConnected }) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const inputRef = useRef(null);

    // Debounced typing indicator
    const emitTypingStart = useCallback(
        debounce(() => {
            if (isConnected) {
                socketService.emit('typing:start');
            }
        }, 300),
        [isConnected]
    );

    const emitTypingStop = useCallback(
        debounce(() => {
            if (isConnected) {
                socketService.emit('typing:stop');
            }
        }, 1000),
        [isConnected]
    );

    useEffect(() => {
        // Cleanup debounced functions
        return () => {
            emitTypingStart.cancel();
            emitTypingStop.cancel();
        };
    }, [emitTypingStart, emitTypingStop]);

    const handleChange = useCallback((e) => {
        const value = e.target.value;
        setMessage(value);

        if (value.trim()) {
            emitTypingStart();
            emitTypingStop();
        }
    }, [emitTypingStart, emitTypingStop]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        if (!message.trim() || isSending || !isConnected) {
            return;
        }

        setIsSending(true);

        try {
            await onSendMessage(message);
            setMessage('');
            inputRef.current?.focus();
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
            socketService.emit('typing:stop');
        }
    }, [message, isSending, isConnected, onSendMessage]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    }, [handleSubmit]);

    const isDisabled = !isConnected || isSending || !message.trim();

    return (
        <div className="chat-input">
            <form onSubmit={handleSubmit} className="d-flex gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    className="form-control"
                    placeholder={isConnected ? "Введите сообщение..." : "Подключение..."}
                    value={message}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    disabled={!isConnected}
                    maxLength={2000}
                />
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isDisabled}
                >
                    {isSending ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                        <i className="bi bi-send-fill"></i>
                    )}
                </button>
            </form>
            {!isConnected && (
                <div className="text-danger small mt-1">
                    <i className="bi bi-exclamation-circle"></i> Нет подключения к серверу
                </div>
            )}
        </div>
    );
};

export default ChatInput;