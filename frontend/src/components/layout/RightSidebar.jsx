// frontend/src/components/layout/RightSidebar.jsx
import { memo } from 'react';

const RightSidebar = memo(({ users = [], currentUser, isOpen, onClose }) => {
    const renderUserList = () => {
        if (users.length === 0) {
            return (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <i className="bi bi-people"></i>
                    </div>
                    <p>Нет пользователей онлайн</p>
                </div>
            );
        }

        return users.map((user) => (
            <div
                key={user._id}
                className={`user-item ${user._id === currentUser?._id ? 'current-user' : ''}`}
            >
                {user.username}
                {user._id === currentUser?._id && (
                    <span className="badge bg-primary ms-2" style={{ fontSize: '0.65rem' }}>Вы</span>
                )}
            </div>
        ));
    };

    return (
        <>
            {/* Desktop Right Sidebar */}

            <h5>
                <i className="bi bi-people-fill text-primary me-2"></i>
                Онлайн
            </h5>
            <span className="badge bg-primary">{users.length}</span>

            {renderUserList()}

        </>
    );
});

RightSidebar.displayName = 'RightSidebar';

export default RightSidebar;