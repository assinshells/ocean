// frontend/src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // ✅ Очищаем ошибку при изменении полей
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // ✅ login теперь возвращает объект с error, а не пробрасывает исключение
            const result = await login(formData);
            
            if (result.error) {
                // ✅ Ошибка обрабатывается без refresh
                setError(result.error);
                setLoading(false);
                return;
            }

            // ✅ Успешный вход - переходим в чат
            navigate('/chat', { replace: true });
        } catch (err) {
            // ✅ Fallback на случай неожиданных ошибок
            console.error('Login error:', err);
            setError('Произошла непредвиденная ошибка');
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="row justify-content-center align-items-center min-vh-100">
                <div className="col-md-6 col-lg-4">
                    <div className="card shadow">
                        <div className="card-body p-4">
                            <h2 className="text-center mb-4">
                                <i className="bi bi-chat-dots-fill text-primary"></i> Вход в чат
                            </h2>

                            {error && (
                                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    {error}
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setError('')}
                                        aria-label="Close"
                                    ></button>
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label htmlFor="username" className="form-label">
                                        Имя пользователя
                                    </label>
                                    <input
                                        type="text"
                                        className={`form-control ${error ? 'is-invalid' : ''}`}
                                        id="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        disabled={loading}
                                        required
                                        autoComplete="username"
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="password" className="form-label">
                                        Пароль
                                    </label>
                                    <input
                                        type="password"
                                        className={`form-control ${error ? 'is-invalid' : ''}`}
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={loading}
                                        required
                                        autoComplete="current-password"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100 mb-3"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Вход...
                                        </>
                                    ) : (
                                        'Войти'
                                    )}
                                </button>

                                <div className="text-center">
                                    <Link to="/forgot-password" className="text-decoration-none">
                                        Забыли пароль?
                                    </Link>
                                </div>

                                <hr />

                                <div className="text-center">
                                    <span className="text-muted">Нет аккаунта?</span>{' '}
                                    <Link to="/register" className="text-decoration-none">
                                        Зарегистрироваться
                                    </Link>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;