// frontend/src/components/chat/ChatHeader.jsx
const ChatHeader = ({ isConnected = false, messagesCount = 0 }) => {
    return (
        <div className="chat-header">
            <div className="chat-header-content">
                {/* Left Section */}
                <div className="chat-header-left">
                    <div className="chat-avatar-group">
                        <div className="chat-avatar">
                            <i className="bi bi-chat-dots-fill"></i>
                        </div>
                    </div>
                    <div className="chat-info">
                        <h5 className="chat-title">Общий чат</h5>
                        <div className="chat-status">
                            {isConnected ? (
                                <>
                                    <span className="status-dot online"></span>
                                    <span className="status-text">Подключено</span>
                                </>
                            ) : (
                                <>
                                    <span className="status-dot offline"></span>
                                    <span className="status-text">Подключение...</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Section */}
                <div className="chat-header-right">
                    {/* Messages Counter */}
                    <div className="header-stat">
                        <i className="bi bi-envelope-fill"></i>
                        <span className="stat-value">{messagesCount}</span>
                    </div>

                    {/* Actions Dropdown */}
                    <div className="dropdown">
                        <button
                            className="btn btn-icon dropdown-toggle"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                            <li>
                                <a className="dropdown-item" href="#" onClick={(e) => e.preventDefault()}>
                                    <i className="bi bi-search me-2"></i>
                                    Поиск сообщений
                                </a>
                            </li>
                            <li>
                                <a className="dropdown-item" href="#" onClick={(e) => e.preventDefault()}>
                                    <i className="bi bi-bell me-2"></i>
                                    Уведомления
                                </a>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                                <a className="dropdown-item" href="#" onClick={(e) => e.preventDefault()}>
                                    <i className="bi bi-info-circle me-2"></i>
                                    О чате
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Connection Warning */}
            {!isConnected && (
                <div className="connection-warning">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Проблемы с подключением. Проверьте интернет-соединение.
                </div>
            )}
        </div>
    );
};

export default ChatHeader;