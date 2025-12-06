import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    // ✅ НОВОЕ: Функция очистки формы
    const clearForm = () => {
        setFormData({ username: '', password: '', email: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Валидация
        if (!formData.username.trim() || !formData.password.trim()) {
            setError('Заполните обязательные поля');
            clearForm(); // ✅ Очищаем при пустых полях
            return;
        }

        if (formData.username.length < 3) {
            setError('Имя пользователя должно быть минимум 3 символа');
            clearForm(); // ✅ Очищаем при невалидном username
            return;
        }

        if (formData.password.length < 6) {
            setError('Пароль должен быть минимум 6 символов');
            // ✅ При ошибке пароля очищаем только пароль
            setFormData(prev => ({ ...prev, password: '' }));
            return;
        }

        setError('');
        setLoading(true);

        try {
            const result = await register(formData);

            if (result.error) {
                setError(result.error);

                // ✅ НОВОЕ: Умная очистка в зависимости от ошибки
                if (result.error.includes('уже существует') ||
                    result.error.includes('уже используется')) {
                    // Если username/email занят - очищаем всю форму
                    clearForm();
                } else {
                    // При других ошибках очищаем только пароль
                    setFormData(prev => ({ ...prev, password: '' }));
                }
                return;
            }

            navigate('/chat', { replace: true });
        } catch (err) {
            console.error('Registration error:', err);
            setError('Произошла непредвиденная ошибка');
            clearForm(); // ✅ Очищаем при неожиданных ошибках
        } finally {
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
                                <i className="bi bi-person-plus-fill text-primary"></i> Регистрация
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
                                        Имя пользователя <span className="text-danger">*</span>
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
                                        minLength={3}
                                        maxLength={30}
                                        pattern="[a-zA-Z0-9_]+"
                                        title="Только буквы, цифры и подчёркивание"
                                        autoComplete="username"
                                        autoFocus
                                    />
                                    <div className="form-text">
                                        От 3 до 30 символов (буквы, цифры, подчёркивание)
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="email" className="form-label">
                                        Email <span className="text-muted">(опционально)</span>
                                    </label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={loading}
                                        autoComplete="email"
                                    />
                                    <div className="form-text">
                                        Используется для восстановления пароля
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="password" className="form-label">
                                        Пароль <span className="text-danger">*</span>
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
                                        minLength={6}
                                        autoComplete="new-password"
                                    />
                                    <div className="form-text">
                                        Минимум 6 символов
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100 mb-3"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Регистрация...
                                        </>
                                    ) : (
                                        'Зарегистрироваться'
                                    )}
                                </button>

                                <hr />

                                <div className="text-center">
                                    <span className="text-muted">Уже есть аккаунт?</span>{' '}
                                    <Link to="/login" className="text-decoration-none">
                                        Войти
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

export default Register;