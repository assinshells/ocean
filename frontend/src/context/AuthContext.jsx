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

  // ✅ НОВОЕ: состояние подключения Socket
  const [socketConnected, setSocketConnected] = useState(false);

  const initPromiseRef = useRef(null);
  const isMountedRef = useRef(true);

  // ✅ НОВОЕ: Слушатель состояния Socket
  useEffect(() => {
    const handleConnect = () => {
      logger.info("Socket connected in AuthContext");
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      logger.warn("Socket disconnected in AuthContext");
      setSocketConnected(false);
    };

    socketService.on("connect", handleConnect);
    socketService.on("disconnect", handleDisconnect);

    // Проверяем текущее состояние
    setSocketConnected(socketService.isConnected());

    return () => {
      socketService.off("connect", handleConnect);
      socketService.off("disconnect", handleDisconnect);
    };
  }, []);

  const initAuth = useCallback(async () => {
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    initPromiseRef.current = (async () => {
      try {
        const response = await authAPI.verifyToken();
        const userData = response.data.data.user;

        if (!isMountedRef.current) return;

        setUser(userData);
        
        // ✅ Подключаем Socket и ждём подключения
        socketService.connect(token);
        
        // ✅ Даём Socket время на подключение
        await new Promise((resolve) => {
          if (socketService.isConnected()) {
            resolve();
          } else {
            const checkConnection = () => {
              if (socketService.isConnected()) {
                socketService.off("connect", checkConnection);
                resolve();
              }
            };
            socketService.on("connect", checkConnection);
            
            // Timeout на случай проблем
            setTimeout(() => {
              socketService.off("connect", checkConnection);
              resolve();
            }, 5000);
          }
        });

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
      
      // ✅ НЕ пробрасываем ошибку дальше, чтобы избежать unhandled rejection
      return { error: errorMsg };
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
      
      return { error: errorMsg };
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
      setSocketConnected(false);
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
      socketConnected, // ✅ НОВОЕ: передаём состояние Socket
      login,
      register,
      logout,
      updateUser,
      clearError,
    }),
    [user, loading, error, socketConnected, login, register, logout, updateUser, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};