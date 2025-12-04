const LeftSidebar = ({ users, currentUser }) => {
    return (
        <div className="left-sidebar">
            <div className="sidebar-header">
                <h5 className="mb-0">
                    <i className="bi bi-people-fill"></i> Пользователи онлайн
                </h5>
                <span className="badge bg-primary rounded-pill">{users.length}</span>
            </div>

            <div className="user-list">
                {users.map((user) => (
                    <div
                        key={user._id}
                        className={`user-item ${user._id === currentUser?._id ? 'current-user' : ''}`}
                    >
                        <div className="user-avatar">
                            <i className="bi bi-person-circle"></i>
                        </div>
                        <div className="user-info">
                            <div className="user-name">{user.username}</div>
                            <div className="user-status">
                                <span className="status-dot online"></span>
                                В сети
                            </div>
                        </div>
                    </div>
                ))}

                {users.length === 0 && (
                    <div className="text-center text-muted p-3">
                        <i className="bi bi-info-circle"></i>
                        <p className="mb-0 mt-2">Нет пользователей онлайн</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeftSidebar;