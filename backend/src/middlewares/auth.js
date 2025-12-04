import { verifyToken } from "../utils/token.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Token not provided");
    }

    const token = authHeader.split(" ")[1];

    if (!token || token === "null" || token === "undefined") {
      throw ApiError.unauthorized("Invalid token format");
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      throw ApiError.unauthorized("Invalid or expired token");
    }

    // Используем select для явного исключения пароля
    const user = await User.findById(decoded.userId)
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .lean();

    if (!user) {
      throw ApiError.unauthorized("User not found");
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      logger.warn("Invalid JWT token", { error: error.message });
      return next(ApiError.unauthorized("Invalid token"));
    }

    if (error.name === "TokenExpiredError") {
      logger.warn("Expired JWT token", { error: error.message });
      return next(ApiError.unauthorized("Token expired"));
    }

    next(error);
  }
};

// Optional auth - не выбрасывает ошибку если токена нет
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = verifyToken(token);

      if (decoded && decoded.userId) {
        const user = await User.findById(decoded.userId)
          .select("-password -resetPasswordToken -resetPasswordExpires")
          .lean();

        if (user) {
          req.user = user;
          req.userId = user._id;
        }
      }
    }

    next();
  } catch (error) {
    // Просто игнорируем ошибки в optional auth
    next();
  }
};
