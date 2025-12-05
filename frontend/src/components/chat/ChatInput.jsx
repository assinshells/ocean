import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import socketService from '../../services/socket';
import { debounce } from '../../utils/helpers';

const ChatInput = ({ onSendMessage, isConnected = false }) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const inputRef = useRef(null);
    const isTypingRef = useRef(false);

    // Создаём debounced функции один раз с useMemo
    const emitTypingStart = useMemo(
        () =>
            debounce(() => {
                if (isConnected && !isTypingRef.current) {
                    socketService.emit('typing:start');
                    isTypingRef.current = true;
                }
            }, 300),
        [isConnected]
    );

    const emitTypingStop = useMemo(
        () =>
            debounce(() => {
                if (isConnected && isTypingRef.current) {
                    socketService.emit('typing:stop');
                    isTypingRef.current = false;
                }
            }, 1000),
        [isConnected]
    );

    useEffect(() => {
        // Cleanup debounced functions и сброс typing при размонтировании
        return () => {
            emitTypingStart.cancel();
            emitTypingStop.cancel();

            if (isTypingRef.current && isConnected) {
                socketService.emit('typing:stop');
                isTypingRef.current = false;
            }
        };
    }, [emitTypingStart, emitTypingStop, isConnected]);

    const handleChange = useCallback(
        (e) => {
            const value = e.target.value;
            setMessage(value);

            if (value.trim() && isConnected) {
                emitTypingStart();
                emitTypingStop();
            } else if (isTypingRef.current) {
                emitTypingStop.cancel();
                if (isConnected) {
                    socketService.emit('typing:stop');
                    isTypingRef.current = false;
                }
            }
        },
        [emitTypingStart, emitTypingStop, isConnected]
    );

    const handleSubmit = useCallback(
        async (e) => {
            e.preventDefault();

            const trimmedMessage = message.trim();

            if (!trimmedMessage || isSending || !isConnected) {
                return;
            }

            setIsSending(true);

            try {
                await onSendMessage(trimmedMessage);
                setMessage('');
                inputRef.current?.focus();

                // Останавливаем typing индикатор
                emitTypingStop.cancel();
                if (isTypingRef.current && isConnected) {
                    socketService.emit('typing:stop');
                    isTypingRef.current = false;
                }
            } catch (error) {
                console.error('Failed to send message:', error);
            } finally {
                setIsSending(false);
            }
        },
        [message, isSending, isConnected, onSendMessage, emitTypingStop]
    );

    const handleKeyPress = useCallback(
        (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
            }
        },
        [handleSubmit]
    );

    const isDisabled = !isConnected || isSending || !message.trim();
    const charCount = message.length;
    const isNearLimit = charCount > 1800;

    return (
        <div className="chat-input">
            <form onSubmit={handleSubmit} className="d-flex gap-2">
                <div className="flex-grow-1 position-relative">
                    <input
                        ref={inputRef}
                        type="text"
                        className={`form-control ${isNearLimit ? 'border-warning' : ''}`}
                        placeholder={
                            isConnected
                                ? 'Введите сообщение...'
                                : 'Подключение...'
                        }
                        value={message}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        disabled={!isConnected}
                        maxLength={2000}
                        autoComplete="off"
                    />
                    {charCount > 0 && (
                        <small
                            className={`position-absolute end-0 bottom-0 me-2 mb-1 ${isNearLimit ? 'text-warning' : 'text-muted'
                                }`}
                        >
                            {charCount}/2000
                        </small>
                    )}
                </div>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isDisabled}
                    aria-label="Send message"
                >
                    {isSending ? (
                        <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                        ></span>
                    ) : (
                        <i className="bi bi-send-fill"></i>
                    )}
                </button>
            </form>
            {!isConnected && (
                <div className="text-danger small mt-1">
                    <i className="bi bi-exclamation-circle"></i> Нет подключения
                    к серверу
                </div>
            )}
        </div>
    );
};

export default ChatInput;