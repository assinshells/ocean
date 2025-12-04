import Message from "../models/Message.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

class MessageService {
  async getMessages(page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        Message.find().sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
        Message.countDocuments(),
      ]);

      return {
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error("Failed to get messages", { error: error.message });
      throw ApiError.internal("Failed to retrieve messages");
    }
  }

  async getMessageById(messageId) {
    try {
      const message = await Message.findById(messageId).lean();

      if (!message) {
        throw ApiError.notFound("Message not found");
      }

      return message;
    } catch (error) {
      if (error instanceof ApiError) throw error;

      logger.error("Failed to get message", {
        messageId,
        error: error.message,
      });
      throw ApiError.internal("Failed to retrieve message");
    }
  }

  async deleteMessage(messageId, userId) {
    try {
      const message = await Message.findById(messageId);

      if (!message) {
        throw ApiError.notFound("Message not found");
      }

      // Проверка прав доступа
      if (message.senderId.toString() !== userId.toString()) {
        throw ApiError.forbidden("You can only delete your own messages");
      }

      await message.deleteOne();

      logger.info("Message deleted", { messageId, userId });
    } catch (error) {
      if (error instanceof ApiError) throw error;

      logger.error("Failed to delete message", {
        messageId,
        userId,
        error: error.message,
      });
      throw ApiError.internal("Failed to delete message");
    }
  }
}

export default new MessageService();
