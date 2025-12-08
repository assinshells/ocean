// frontend/src/components/chat/ChatInput.jsx
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import socketService from '../../services/socket';
import { debounce } from '../../utils/helpers';
import logger from '../../utils/logger';

const ChatInput = ({ onSendMessage, isConnected = false }) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const inputRef = useRef(null);
    const isTypingRef = useRef(false);

    useEffect(() => {
        logger.debug("ChatInput connection state", { isConnected });
    }, [isConnected]);

    const emitTypingStart = useMemo(
        () =>
            debounce(() => {
                if (isConnected && !isTypingRef.current) {
                    logger.debug("Emitting typing:start");
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
                    logger.debug("Emitting typing:stop");
                    socketService.emit('typing:stop');
                    isTypingRef.current = false;
                }
            }, 1000),
        [isConnected]
    );

    useEffect(() => {
        return () => {
            emitTypingStart.cancel();
            emitTypingStop.cancel();

            if (isTypingRef.current && isConnected) {
                socketService.emit('typing:stop');
                isTypingRef.current = false;
            }
        };
    }, [emitTypingStart, emitTypingStop, isConnected]);

    const clearInput = useCallback((shouldFocus = false) => {
        setMessage('');

        emitTypingStop.cancel();
        if (isTypingRef.current && isConnected) {
            socketService.emit('typing:stop');
            isTypingRef.current = false;
        }

        if (shouldFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [emitTypingStop, isConnected]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && message.trim()) {
                clearInput(true);
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [message, clearInput]);

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

            if (!trimmedMessage) {
                logger.warn("Submit blocked: empty message");
                return;
            }

            if (isSending) {
                logger.warn("Submit blocked: already sending");
                return;
            }

            if (!isConnected) {
                logger.error("Submit blocked: not connected");
                return;
            }

            setIsSending(true);

            try {
                logger.info("Submitting message", {
                    length: trimmedMessage.length,
                    isConnected,
                    socketId: socketService.getSocket()?.id
                });

                await onSendMessage(trimmedMessage);
                clearInput(true);
                logger.debug("Message submitted successfully");
            } catch (error) {
                logger.error('Failed to send message', {
                    error: error.message,
                    stack: error.stack
                });
            } finally {
                setIsSending(false);
            }
        },
        [message, isSending, isConnected, onSendMessage, clearInput]
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
    const isOverLimit = charCount > 2000;

    return (
        <div className="chat-input-container">
            <form onSubmit={handleSubmit} className="chat-input-form">
                {/* Additional Actions (опционально) */}
                <div className="input-actions-left">
                    <button
                        type="button"
                        className="btn btn-icon"
                        title="Прикрепить файл"
                        disabled={!isConnected}
                    >
                        <i className="bi bi-paperclip"></i>
                    </button>
                    <button
                        type="button"
                        className="btn btn-icon"
                        title="Emoji"
                        disabled={!isConnected}
                    >
                        <i className="bi bi-emoji-smile"></i>
                    </button>
                </div>

                {/* Text Input */}
                <div className="input-field-wrapper">
                    <textarea
                        ref={inputRef}
                        className={`form-control chat-textarea ${isNearLimit ? 'border-warning' : ''}`}
                        placeholder={
                            isConnected
                                ? 'Введите сообщение...'
                                : 'Подключение к серверу...'
                        }
                        value={message}
                        onChange={handleChange}
                        onKeyDown={handleKeyPress}
                        disabled={!isConnected}
                        maxLength={2000}
                        autoComplete="off"
                        rows={1}
                        style={{
                            minHeight: '44px',
                            maxHeight: '120px',
                            resize: 'none',
                            overflow: 'auto'
                        }}
                    />

                    {/* Character Counter & Clear Button */}
                    {charCount > 0 && (
                        <div className="input-indicators">
                            <small
                                className={`char-counter ${isOverLimit ? 'text-danger fw-bold' :
                                        isNearLimit ? 'text-warning' :
                                            'text-muted'
                                    }`}
                            >
                                {charCount}/2000
                            </small>

                            <button
                                type="button"
                                className="btn btn-clear"
                                onClick={() => clearInput(true)}
                                title="Очистить (ESC)"
                                tabIndex={-1}
                            >
                                <i className="bi bi-x-circle-fill"></i>
                            </button>
                        </div>
                    )}
                </div>

                {/* Send Button */}
                <button
                    type="submit"
                    className="btn btn-send"
                    disabled={isDisabled}
                    title={
                        !isConnected
                            ? "Нет подключения"
                            : isSending
                                ? "Отправка..."
                                : isOverLimit
                                    ? "Сообщение слишком длинное"
                                    : "Отправить (Enter)"
                    }
                >
                    {isSending ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                        <i className="bi bi-send-fill"></i>
                    )}
                </button>
            </form>

            {/* Error Messages */}
            {!isConnected && (
                <div className="input-warning">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    Нет подключения к серверу
                </div>
            )}

            {isOverLimit && (
                <div className="input-warning text-danger">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    Сообщение превышает максимальную длину
                </div>
            )}
        </div>
    );
};

export default ChatInput;