// frontend/src/components/chat/TypingIndicator.jsx
const TypingIndicator = ({ users }) => {
    if (!users || users.length === 0) return null;

    const getTypingText = () => {
        if (users.length === 1) {
            return `${users[0]} печатает...`;
        } else if (users.length === 2) {
            return `${users[0]} и ${users[1]} печатают...`;
        } else {
            return `${users.length} пользователей печатают...`;
        }
    };

    return (
        <div className="typing-indicator">
            <div className="typing-text">
                <i className="bi bi-three-dots"></i>
                <span className="ms-2">{getTypingText()}</span>
            </div>
        </div>
    );
};

export default TypingIndicator;