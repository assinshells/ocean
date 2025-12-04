import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Profile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="container">
            <div className="row justify-content-center align-items-center min-vh-100">
                <div className="col-md-6 col-lg-5">
                    <div className="card shadow">
                        <div className="card-body p-4">
                            <div className="text-center mb-4">
                                <div className="avatar-large bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3">
                                    <i className="bi bi-person-fill" style={{ fontSize: '3rem' }}></i>
                                </div>
                                <h2>{user.username}</h2>
                                <span className={`badge ${user.isOnline ? 'bg-success' : 'bg-secondary'}`}>
                                    {user.isOnline ? 'В сети' : 'Не в сети'}
                                </span>
                            </div>

                            <div className="mb-3">
                                <label className="text-muted small">Email</label>
                                <p className="mb-0">{user.email || 'Не указан'}</p>
                            </div>

                            <div className="mb-3">
                                <label className="text-muted small">Дата регистрации</label>
                                <p className="mb-0">{formatDate(user.createdAt)}</p>
                            </div>

                            <div className="mb-4">
                                <label className="text-muted small">Последняя активность</label>
                                <p className="mb-0">{formatDate(user.lastSeen)}</p>
                            </div>

                            <button
                                onClick={() => navigate('/chat')}
                                className="btn btn-primary w-100 mb-2"
                            >
                                <i className="bi bi-chat-dots"></i> К чату
                            </button>

                            <button
                                onClick={handleLogout}
                                className="btn btn-outline-danger w-100"
                            >
                                <i className="bi bi-box-arrow-right"></i> Выйти
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;