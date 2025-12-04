const ChatHeader = () => {
    return (
        <div className="chat-header">
            <div className="d-flex align-items-center">
                <i className="bi bi-chat-dots-fill text-primary me-2"></i>
                <h5 className="mb-0">Общий чат</h5>
            </div>
            <div className="text-muted small">
                <i className="bi bi-info-circle"></i> Онлайн чат
            </div>
        </div>
    );
};

export default ChatHeader;