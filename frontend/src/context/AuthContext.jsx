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
  const [socketConnected, setSocketConnected] = useState(false);

  const initPromiseRef = useRef(null);
  const isMountedRef = useRef(true);

  // ✅ ИСПРАВЛЕНО: Слушатель состояния Socket с принудительной проверкой
  useEffect(() => {
    const handleConnect = () => {
      logger.info("Socket connected in AuthContext");
      if (isMountedRef.current) {
        setSocketConnected(true);
      }
    };

    const handleDisconnect = () => {
      logger.warn("Socket disconnected in AuthContext");
      if (isMountedRef.current) {
        setSocketConnected(false);
      }
    };

    const handleConnectError = (error) => {
      logger.error("Socket connection error in AuthContext", {
        error: error?.message || "Unknown error"
      });
      if (isMountedRef.current) {
        setSocketConnected(false);
      }
    };

    socketService.on("connect", handleConnect);
    socketService.on("disconnect", handleDisconnect);
    socketService.on("connect_error", handleConnectError);

    // ✅ НОВОЕ: Периодическая проверка состояния Socket (на случай race condition)
    const checkInterval = setInterval(() => {
      if (isMountedRef.current) {
        const isConnected = socketService.isConnected();
        setSocketConnected(prev => {
          if (prev !== isConnected) {
            logger.debug("Socket state synchronized", {
              wasConnected: prev,
              nowConnected: isConnected
            });
          }
          return isConnected;
        });
      }
    }, 1000); // Проверяем каждую секунду

    // Проверяем текущее состояние сразу
    if (isMountedRef.current) {
      setSocketConnected(socketService.isConnected());
    }

    return () => {
      clearInterval(checkInterval);
      socketService.off("connect", handleConnect);
      socketService.off("disconnect", handleDisconnect);
      socketService.off("connect_error", handleConnectError);
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

        try {
          await socketService.connect(token);

          // ✅ НОВОЕ: Принудительная синхронизация состояния после подключения
          if (isMountedRef.current) {
            setSocketConnected(socketService.isConnected());
          }

          logger.info("User authenticated and socket connected", {
            username: userData.username,
            socketConnected: socketService.isConnected()
          });
        } catch (socketError) {
          logger.error("Socket connection failed during init", {
            error: socketError.message
          });

          // ✅ НОВОЕ: Синхронизация состояния даже при ошибке
          if (isMountedRef.current) {
            setSocketConnected(socketService.isConnected());
          }
        }

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

      try {
        await socketService.connect(token);

        // ✅ НОВОЕ: Принудительная синхронизация состояния
        if (isMountedRef.current) {
          setSocketConnected(socketService.isConnected());
        }

        logger.info("User logged in and socket connected", {
          username: userData.username,
          socketConnected: socketService.isConnected()
        });
      } catch (socketError) {
        logger.error("Socket connection failed during login", {
          error: socketError.message
        });

        // ✅ НОВОЕ: Синхронизация состояния даже при ошибке
        if (isMountedRef.current) {
          setSocketConnected(socketService.isConnected());
        }
      }

      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Login failed";
      setError(errorMsg);
      logger.error("Login failed", { error: errorMsg });

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

      try {
        await socketService.connect(token);

        // ✅ НОВОЕ: Принудительная синхронизация состояния
        if (isMountedRef.current) {
          setSocketConnected(socketService.isConnected());
        }

        logger.info("User registered and socket connected", {
          username: newUser.username,
          socketConnected: socketService.isConnected()
        });
      } catch (socketError) {
        logger.error("Socket connection failed during registration", {
          error: socketError.message
        });

        // ✅ НОВОЕ: Синхронизация состояния даже при ошибке
        if (isMountedRef.current) {
          setSocketConnected(socketService.isConnected());
        }
      }

      return { success: true, data: response.data };
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
      socketConnected,
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