// frontend/src/components/layout/RightSidebar.jsx
import { memo } from 'react';

const RightSidebar = memo(({ users = [], currentUser, isOpen, onClose }) => {
    const renderUserList = () => {
        if (users.length === 0) {
            return (
                <div className="empty-state text-center py-5">
                    <i className="bi bi-people text-muted" style={{ fontSize: '3rem' }}></i>
                    <p className="text-muted mt-3 mb-0">Нет пользователей онлайн</p>
                </div>
            );
        }

        return users.map((user) => {
            const isCurrentUser = user._id === currentUser?._id;

            return (
                <div
                    key={user._id}
                    className={`user-item d-flex align-items-center p-3 ${isCurrentUser ? 'current-user' : ''}`}
                >
                    {/* Avatar */}
                    <div className="user-avatar me-3">
                        <div className="avatar-circle">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="status-dot online"></span>
                    </div>

                    {/* User Info */}
                    <div className="user-info flex-grow-1">
                        <div className="user-name">
                            {user.username}
                        </div>
                        {isCurrentUser && (
                            <span className="badge bg-primary badge-sm">Вы</span>
                        )}
                    </div>

                    {/* Actions (опционально) */}
                    {!isCurrentUser && (
                        <div className="user-actions">
                            <button
                                className="btn btn-sm btn-link text-muted p-1"
                                title="Написать"
                                onClick={() => console.log('Message to', user.username)}
                            >
                                <i className="bi bi-chat-dots"></i>
                            </button>
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="user-profile-sidebar">
            {/* Header Section - 30% */}
            <div className="sidebar-header">
                <div className="text-center py-4">
                    <div className="sidebar-icon mb-3">
                        <i className="bi bi-people-fill"></i>
                    </div>
                    <h5 className="mb-1">Онлайн пользователи</h5>
                    <div className="online-count">
                        <span className="badge bg-success">
                            {users.length} {users.length === 1 ? 'пользователь' : 'пользователей'}
                        </span>
                    </div>
                </div>

                {/* Search (опционально) */}
                <div className="px-3 pb-3">
                    <div className="input-group input-group-sm">
                        <span className="input-group-text bg-transparent border-end-0">
                            <i className="bi bi-search"></i>
                        </span>
                        <input
                            type="text"
                            className="form-control border-start-0"
                            placeholder="Поиск..."
                        />
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="sidebar-divider"></div>

            {/* Users List Section - 70% */}
            <div className="sidebar-body">
                <div className="users-list">
                    {renderUserList()}
                </div>
            </div>
        </div>
    );
});

RightSidebar.displayName = 'RightSidebar';

export default RightSidebar;