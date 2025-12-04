import messageService from "../services/messageService.js";
import ApiError from "../utils/ApiError.js";

class MessageController {
  async getMessages(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        throw ApiError.badRequest("Invalid pagination parameters");
      }

      const result = await messageService.getMessages(pageNum, limitNum);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessageById(req, res, next) {
    try {
      const { id } = req.params;
      const message = await messageService.getMessageById(id);

      res.json({
        success: true,
        data: { message },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      await messageService.deleteMessage(id, userId);

      res.json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new MessageController();
