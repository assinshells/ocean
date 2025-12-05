// backend/src/services/authService.js
import User from "../models/User.js";
import {
  generateToken,
  generateResetToken,
  hashResetToken,
} from "../utils/token.js";
import ApiError from "../utils/ApiError.js";
import { createServiceLogger } from "../config/logger.js";
import errorLogger from "../utils/errorLogger.js";

const logger = createServiceLogger("AuthService");

class AuthService {
  async register({ username, password, email }) {
    const startTime = Date.now();

    try {
      const existingUser = await User.findOne({ username }).lean();
      if (existingUser) {
        throw ApiError.conflict("Пользователь с таким именем уже существует");
      }

      if (email) {
        const existingEmail = await User.findOne({ email }).lean();
        if (existingEmail) {
          throw ApiError.conflict("Email уже используется");
        }
      }

      const user = new User({ username, password, email });
      await user.save();

      const token = generateToken(user._id);

      logger.info({
        msg: "User registered successfully",
        userId: user._id.toString(),
        username: user.username,
        duration: Date.now() - startTime,
      });

      return { token, user: user.toJSON() };
    } catch (error) {
      errorLogger.logAuthError(
        {
          type: "registration",
          username,
        },
        error
      );

      logger.error({
        msg: "Registration failed",
        error: error.message,
        username,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  async login({ username, password }) {
    const startTime = Date.now();

    try {
      const user = await User.findOne({ username }).select("+password");

      if (!user) {
        // ✅ УЛУЧШЕНО: Более детальное логирование
        errorLogger.logAuthError(
          {
            type: "login",
            username,
            reason: "user_not_found",
          },
          new Error("User not found")
        );

        // ✅ ВАЖНО: НЕ выбрасываем ошибку сразу, чтобы избежать timing attack
        // Имитируем задержку сравнения пароля
        await new Promise((resolve) => setTimeout(resolve, 100));

        throw ApiError.unauthorized("Incorrect username or password");
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        // ✅ УЛУЧШЕНО: Логируем неверный пароль
        errorLogger.logAuthError(
          {
            type: "login",
            username,
            reason: "invalid_password",
          },
          new Error("Invalid password")
        );

        logger.warn({
          msg: "Login failed: invalid password",
          userId: user._id.toString(),
          username,
          duration: Date.now() - startTime,
        });

        throw ApiError.unauthorized("Incorrect username or password");
      }

      const token = generateToken(user._id);

      logger.info({
        msg: "User logged in successfully",
        userId: user._id.toString(),
        username: user.username,
        duration: Date.now() - startTime,
      });

      const userObject = user.toObject();
      delete userObject.password;

      return { token, user: userObject };
    } catch (error) {
      // ✅ УЛУЧШЕНО: Логируем только если ещё не залогировано
      if (!(error instanceof ApiError)) {
        logger.error({
          msg: "Login failed with unexpected error",
          error: error.message,
          username,
          duration: Date.now() - startTime,
        });
      }
      throw error;
    }
  }

  async verifyToken(userId) {
    try {
      const user = await User.findById(userId).select("-password").lean();

      if (!user) {
        logger.warn("Token verification failed: user not found", { userId });
        throw ApiError.unauthorized("Пользователь не найден");
      }

      logger.debug("Token verified successfully", {
        userId: user._id.toString(),
        username: user.username,
      });

      return user;
    } catch (error) {
      logger.error("Token verification failed", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  async forgotPassword(email) {
    const startTime = Date.now();

    try {
      const user = await User.findOne({ email }).select(
        "+resetPasswordToken +resetPasswordExpires"
      );

      if (!user) {
        logger.warn("Forgot password: user not found", { email });
        throw ApiError.notFound("Пользователь с таким email не найден");
      }

      const resetToken = generateResetToken();
      const hashedToken = hashResetToken(resetToken);

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = Date.now() + 3600000;
      await user.save();

      logger.info("Password reset requested", {
        userId: user._id.toString(),
        email,
        duration: Date.now() - startTime,
      });

      return resetToken;
    } catch (error) {
      logger.error("Forgot password failed", {
        error: error.message,
        email,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    const startTime = Date.now();

    try {
      const hashedToken = hashResetToken(token);

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      }).select("+resetPasswordToken +resetPasswordExpires +password");

      if (!user) {
        logger.warn("Password reset failed: invalid or expired token");
        throw ApiError.badRequest("Недействительный или истёкший токен сброса");
      }

      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      logger.info("Password reset successfully", {
        userId: user._id.toString(),
        duration: Date.now() - startTime,
      });

      const userObject = user.toObject();
      delete userObject.password;

      return userObject;
    } catch (error) {
      logger.error("Password reset failed", {
        error: error.message,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }
}

export default new AuthService();
