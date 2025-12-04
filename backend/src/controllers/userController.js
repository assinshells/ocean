import userService from "../services/userService.js";

class UserController {
  async getProfile(req, res, next) {
    try {
      const user = await userService.getProfile(req.user._id);

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOnlineUsers(req, res, next) {
    try {
      const users = await userService.getOnlineUsers();

      res.json({
        success: true,
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      const users = await userService.getAllUsers();

      res.json({
        success: true,
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
