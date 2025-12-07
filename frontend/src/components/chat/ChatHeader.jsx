// frontend/src/components/chat/ChatHeader.jsx
const ChatHeader = ({ isConnected = false }) => {
    return (
        <div className="p-3 p-lg-4 border-bottom user-chat-topbar">
            <div className="row align-items-center">
                <div className="col-sm-4 col-8">
                    <div className="d-flex align-items-center">
                        <h5 className="mb-0">Общий чат</h5>
                    </div>
                </div>
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