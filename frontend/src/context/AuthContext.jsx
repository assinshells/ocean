import {
    createContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import { authAPI } from '../services/api';
import socketService from '../services/socket';
import logger from '../utils/logger';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Флаг для предотвращения multiple init calls
    const isInitializing = useRef(false);
    const isInitialized = useRef(false);

    const initAuth = useCallback(async () => {
        // Предотвращаем множественные вызовы
        if (isInitializing.current || isInitialized.current) {
            return;
        }

        isInitializing.current = true;

        const token = localStorage.getItem('token');

        if (!token) {
            setLoading(false);
            isInitializing.current = false;
            return;
        }

        try {
            const response = await authAPI.verifyToken();
            const userData = response.data.data.user;

            setUser(userData);

            // Подключаем сокет только после успешной верификации
            socketService.connect(token);

            logger.info('User authenticated', { username: userData.username });
            isInitialized.current = true;
        } catch (err) {
            logger.error('Token verification failed', { error: err.message });

            // Очищаем невалидные данные
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setError('Session expired');
        } finally {
            setLoading(false);
            isInitializing.current = false;
        }
    }, []);

    useEffect(() => {
        initAuth();
    }, [initAuth]);

    const login = useCallback(async (credentials) => {
        try {
            setLoading(true);
            setError(null);

            const response = await authAPI.login(credentials);
            const { token, user: userData } = response.data.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));

            setUser(userData);
            socketService.connect(token);

            logger.info('User logged in', { username: userData.username });

            return response.data;
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Login failed';
            setError(errorMsg);
            logger.error('Login failed', { error: errorMsg });
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const register = useCallback(async (userData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await authAPI.register(userData);
            const { token, user: newUser } = response.data.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(newUser));

            setUser(newUser);
            socketService.connect(token);

            logger.info('User registered', { username: newUser.username });

            return response.data;
        } catch (err) {
            const errorMsg =
                err.response?.data?.message || 'Registration failed';
            setError(errorMsg);
            logger.error('Registration failed', { error: errorMsg });
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setError(null);
            socketService.disconnect();

            logger.info('User logged out');
        } catch (err) {
            logger.error('Logout error', { error: err.message });
        }
    }, []);

    const updateUser = useCallback((updates) => {
        setUser((prev) => {
            if (!prev) return null;

            const updated = { ...prev, ...updates };

            try {
                localStorage.setItem('user', JSON.stringify(updated));
            } catch (err) {
                logger.error('Failed to update user in localStorage', {
                    error: err.message,
                });
            }

            return updated;
        });
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Восстановление из localStorage при первом рендере (fallback)
    useEffect(() => {
        if (!user && !loading) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                } catch (err) {
                    logger.error('Failed to parse stored user', {
                        error: err.message,
                    });
                    localStorage.removeItem('user');
                }
            }
        }
    }, [user, loading]);

    const value = useMemo(
        () => ({
            user,
            loading,
            error,
            login,
            register,
            logout,
            updateUser,
            clearError,
        }),
        [user, loading, error, login, register, logout, updateUser, clearError]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};