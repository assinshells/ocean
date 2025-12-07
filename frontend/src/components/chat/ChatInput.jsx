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

    // Функция очистки поля ввода
    const clearInput = useCallback((shouldFocus = false) => {
        setMessage('');

        // Останавливаем typing индикатор
        emitTypingStop.cancel();
        if (isTypingRef.current && isConnected) {
            socketService.emit('typing:stop');
            isTypingRef.current = false;
        }

        if (shouldFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [emitTypingStop, isConnected]);

    // Обработчик ESC для очистки
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
                logger.error("Submit blocked: not connected", {
                    isConnected,
                    socketExists: !!socketService.getSocket(),
                    socketId: socketService.getSocket()?.id
                });
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

                // Очищаем поле только после успешной отправки
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
        <div className="chat-input">
            <form onSubmit={handleSubmit}>
                <div className="flex-grow-1 position-relative">
                    <input
                        ref={inputRef}
                        type="text"
                        className={`form-control ${isNearLimit ? 'border-warning' : ''}`}
                        placeholder={
                            isConnected
                                ? 'Введите сообщение...'
                                : 'Подключение к серверу...'
                        }
                        value={message}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        disabled={!isConnected}
                        maxLength={2000}
                        autoComplete="off"
                    />

                    {charCount > 0 && (
                        <div
                            className="position-absolute end-0 bottom-0 me-2 mb-2 d-flex align-items-center gap-2"
                            style={{ pointerEvents: 'auto' }}
                        >
                            <small
                                className={
                                    isOverLimit ? 'text-danger fw-bold' :
                                        isNearLimit ? 'text-warning' :
                                            'text-muted'
                                }
                            >
                                {charCount}/2000
                            </small>

                            <button
                                type="button"
                                className="btn btn-sm btn-link text-muted p-0"
                                onClick={() => clearInput(true)}
                                title="Очистить (ESC)"
                                tabIndex={-1}
                                style={{
                                    fontSize: '0.9rem',
                                    textDecoration: 'none',
                                    opacity: 0.6,
                                    transition: 'opacity 0.2s',
                                    lineHeight: 1
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                            >
                                <i className="bi bi-x-circle"></i>
                            </button>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isDisabled}
                    aria-label="Отправить сообщение"
                    title={
                        !isConnected
                            ? "Нет подключения"
                            : isSending
                                ? "Отправка..."
                                : isOverLimit
                                    ? "Сообщение слишком длинное"
                                    : "Отправить"
                    }
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
                <div className="text-danger small mt-2">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    Нет подключения к серверу. Проверьте соединение.
                </div>
            )}

            {isOverLimit && (
                <div className="text-danger small mt-2">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    Сообщение превышает максимальную длину (2000 символов)
                </div>
            )}
        </div>
    );
};

export default ChatInput;