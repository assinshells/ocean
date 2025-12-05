// frontend/src/context/AuthContext.jsx
import {
    createContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import { authAPI } from "../services/api";
import socketService from "../services/socket";
import logger from "../utils/logger";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Защита от race conditions
    const initPromiseRef = useRef(null);
    const isMountedRef = useRef(true);

    const initAuth = useCallback(async () => {
        // Если инициализация уже идёт, возвращаем существующий промис
        if (initPromiseRef.current) {
            return initPromiseRef.current;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            setLoading(false);
            return;
        }

        // Создаём промис инициализации
        initPromiseRef.current = (async () => {
            try {
                const response = await authAPI.verifyToken();
                const userData = response.data.data.user;

                // Проверяем, что компонент всё ещё смонтирован
                if (!isMountedRef.current) return;

                setUser(userData);
                socketService.connect(token);

                logger.info("User authenticated", { username: userData.username });
            } catch (err) {
                logger.error("Token verification failed", { error: err.message });

                if (!isMountedRef.current) return;

                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setUser(null);
                setError("Session expired");
            } finally {
                if (isMountedRef.current) {
                    setLoading(false);
                }
                initPromiseRef.current = null;
            }
        })();

        return initPromiseRef.current;
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        initAuth();

        return () => {
            isMountedRef.current = false;
        };
    }, [initAuth]);

    const login = useCallback(async (credentials) => {
        try {
            setLoading(true);
            setError(null);

            const response = await authAPI.login(credentials);
            const { token, user: userData } = response.data.data;

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(userData));

            setUser(userData);
            socketService.connect(token);

            logger.info("User logged in", { username: userData.username });

            return response.data;
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Login failed";
            setError(errorMsg);
            logger.error("Login failed", { error: errorMsg });
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

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(newUser));

            setUser(newUser);
            socketService.connect(token);

            logger.info("User registered", { username: newUser.username });

            return response.data;
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Registration failed";
            setError(errorMsg);
            logger.error("Registration failed", { error: errorMsg });
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        try {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setUser(null);
            setError(null);
            socketService.disconnect();

            logger.info("User logged out");
        } catch (err) {
            logger.error("Logout error", { error: err.message });
        }
    }, []);

    const updateUser = useCallback((updates) => {
        setUser((prev) => {
            if (!prev) return null;

            const updated = { ...prev, ...updates };

            try {
                localStorage.setItem("user", JSON.stringify(updated));
            } catch (err) {
                logger.error("Failed to update user in localStorage", {
                    error: err.message,
                });
            }

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

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};