import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const RightSidebar = ({ user }) => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="right-sidebar">
            <div className="sidebar-header">
                <h5 className="mb-0">
                    <i className="bi bi-person-fill"></i> Профиль
                </h5>
            </div>

            <div className="profile-section">
                <div className="text-center mb-4">
                    <div className="avatar-large bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3">
                        <i className="bi bi-person-fill" style={{ fontSize: '2.5rem' }}></i>
                    </div>
                    <h5 className="mb-1">{user.username}</h5>
                    <span className="badge bg-success">В сети</span>
                </div>

                <div className="profile-info">
                    <div className="info-item">
                        <i className="bi bi-envelope"></i>
                        <span>{user.email || 'Email не указан'}</span>
                    </div>
                </div>

                <div className="profile-actions">
                    <button
                        className="btn btn-outline-primary w-100 mb-2"
                        onClick={() => navigate('/profile')}
                    >
                        <i className="bi bi-gear"></i> Настройки
                    </button>
                    <button
                        className="btn btn-outline-danger w-100"
                        onClick={handleLogout}
                    >
                        <i className="bi bi-box-arrow-right"></i> Выйти
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RightSidebar;