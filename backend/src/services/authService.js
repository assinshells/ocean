import User from "../models/User.js";
import {
  generateToken,
  generateResetToken,
  hashResetToken,
} from "../utils/token.js";
import ApiError from "../utils/ApiError.js";
import { createServiceLogger } from "../config/logger.js";

const logger = createServiceLogger("AuthService");

class AuthService {
  async register({ username, password, email }) {
    const startTime = Date.now();

    try {
      // Используем транзакцию для атомарности
      const session = await User.startSession();

      try {
        await session.withTransaction(async () => {
          // Проверка на существование с блокировкой
          const existingUser = await User.findOne({ username }).session(
            session
          );
          if (existingUser) {
            throw ApiError.conflict(
              "Пользователь с таким именем уже существует"
            );
          }

          if (email) {
            const existingEmail = await User.findOne({ email }).session(
              session
            );
            if (existingEmail) {
              throw ApiError.conflict("Email уже используется");
            }
          }

          const user = new User({ username, password, email });
          await user.save({ session });

          const token = generateToken(user._id);

          logger.info("User registered successfully", {
            userId: user._id.toString(),
            username: user.username,
            duration: Date.now() - startTime,
          });

          return { token, user: user.toJSON() };
        });
      } finally {
        await session.endSession();
      }
    } catch (error) {
      logger.error("Registration failed", {
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
      // Используем .select('+password') для получения пароля
      const user = await User.findOne({ username }).select("+password");

      if (!user) {
        logger.warn("Login failed: user not found", { username });
        throw ApiError.unauthorized("Неверное имя пользователя или пароль");
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        logger.warn("Login failed: invalid password", {
          userId: user._id.toString(),
          username,
        });
        throw ApiError.unauthorized("Неверное имя пользователя или пароль");
      }

      const token = generateToken(user._id);

      logger.info("User logged in successfully", {
        userId: user._id.toString(),
        username: user.username,
        duration: Date.now() - startTime,
      });

      // Убираем пароль перед возвратом
      user.password = undefined;

      return {
        token,
        user: user.toJSON(),
      };
    } catch (error) {
      logger.error("Login failed", {
        error: error.message,
        username,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  async verifyToken(userId) {
    try {
      const user = await User.findById(userId).select("-password");

      if (!user) {
        logger.warn("Token verification failed: user not found", { userId });
        throw ApiError.unauthorized("Пользователь не найден");
      }

      logger.debug("Token verified successfully", {
        userId: user._id.toString(),
        username: user.username,
      });

      return user.toJSON();
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

      user.resetPasswordToken = hashedToken; // Храним хеш, а не открытый токен!
      user.resetPasswordExpires = Date.now() + 3600000; // 1 час
      await user.save();

      logger.info("Password reset requested", {
        userId: user._id.toString(),
        email,
        duration: Date.now() - startTime,
      });

      return resetToken; // Возвращаем открытый токен для отправки по email
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
      }).select("+resetPasswordToken +resetPasswordExpires");

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

      return user.toJSON();
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
