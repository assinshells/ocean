import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ ИСПРАВЛЕНО: Убрана принудительная перезагрузка при 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ✅ Обрабатываем 401 только для токен-зависимых запросов
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";

      // ✅ НЕ редиректим на /login и /register эндпоинтах
      if (
        !requestUrl.includes("/auth/login") &&
        !requestUrl.includes("/auth/register") &&
        !requestUrl.includes("/auth/forgot-password")
      ) {
        // ✅ Очищаем токен только если это НЕ запрос на верификацию
        if (!requestUrl.includes("/auth/verify")) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }

        // ✅ Редиректим только если мы НЕ на странице логина
        if (
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/register"
        ) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  verifyToken: () => api.get("/auth/verify"),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword: (data) => api.post("/auth/reset-password", data),
};

export const userAPI = {
  getProfile: () => api.get("/users/me"),
  getOnlineUsers: () => api.get("/users/online"),
  getAllUsers: () => api.get("/users/all"),
};

export default api;
