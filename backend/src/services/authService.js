import User from "../models/User.js";
import { generateToken, generateResetToken } from "../utils/token.js";
import ApiError from "../utils/ApiError.js";

class AuthService {
  async register({ username, password, email }) {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      throw ApiError.conflict("Пользователь с таким именем уже существует");
    }

    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        throw ApiError.conflict("Email уже используется");
      }
    }

    const user = new User({ username, password, email });
    await user.save();

    const token = generateToken(user._id);

    return {
      token,
      user: user.toJSON(),
    };
  }

  async login({ username, password }) {
    const user = await User.findOne({ username });
    if (!user) {
      throw ApiError.unauthorized("Неверное имя пользователя или пароль");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized("Неверное имя пользователя или пароль");
    }

    const token = generateToken(user._id);

    return {
      token,
      user: user.toJSON(),
    };
  }

  async verifyToken(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw ApiError.unauthorized("Пользователь не найден");
    }

    return user.toJSON();
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw ApiError.notFound("Пользователь с таким email не найден");
    }

    const resetToken = generateResetToken();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    return resetToken;
  }

  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw ApiError.badRequest("Недействительный или истёкший токен сброса");
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return user.toJSON();
  }
}

export default new AuthService();
