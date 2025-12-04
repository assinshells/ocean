import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI } from '../services/api';
import socketService from '../services/socket';
import logger from '../utils/logger';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const initAuth = useCallback(async () => {
        const token = localStorage.getItem('token');

        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const response = await authAPI.verifyToken();
            const userData = response.data.data.user;

            setUser(userData);
            socketService.connect(token);

            logger.info('User authenticated', { username: userData.username });
        } catch (err) {
            logger.error('Token verification failed', { error: err.message });
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setError('Session expired');
        } finally {
            setLoading(false);
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
            const errorMsg = err.response?.data?.message || 'Registration failed';
            setError(errorMsg);
            logger.error('Registration failed', { error: errorMsg });
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setError(null);
        socketService.disconnect();

        logger.info('User logged out');
    }, []);

    const updateUser = useCallback((updates) => {
        setUser((prev) => {
            if (!prev) return null;
            const updated = { ...prev, ...updates };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

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

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};