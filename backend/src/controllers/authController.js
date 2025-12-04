import authService from "../services/authService.js";
import mailService from "../services/mailService.js";

class AuthController {
  async register(req, res, next) {
    try {
      const { username, password, email } = req.body;
      const result = await authService.register({ username, password, email });

      res.status(201).json({
        success: true,
        message: "Регистрация успешна",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await authService.login({ username, password });

      res.json({
        success: true,
        message: "Вход выполнен",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyToken(req, res, next) {
    try {
      const user = await authService.verifyToken(req.user._id);

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const resetToken = await authService.forgotPassword(email);
      await mailService.sendPasswordResetEmail(email, resetToken);

      res.json({
        success: true,
        message: "Инструкции по сбросу пароля отправлены на email",
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);

      res.json({
        success: true,
        message: "Пароль успешно изменён",
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
