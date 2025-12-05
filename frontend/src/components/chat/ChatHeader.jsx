// frontend/src/components/chat/ChatHeader.jsx
const ChatHeader = ({ isConnected = false }) => {
    return (
        <div className="chat-header">
            <div className="d-flex align-items-center">
                <i className="bi bi-chat-dots-fill text-primary me-2"></i>
                <h5 className="mb-0">Общий чат</h5>
            </div>
            <div className={`text-muted small ${!isConnected ? 'text-danger' : ''}`}>
                {isConnected ? (
                    <>
                        <span className="status-dot online me-1"></span>
                        <i className="bi bi-wifi"></i> Подключено
                    </>
                ) : (
                    <>
                        <span className="status-dot offline me-1"></span>
                        <i className="bi bi-wifi-off"></i> Отключено
                    </>
                )}
            </div>
        </div>
    );
};

export default ChatHeader;