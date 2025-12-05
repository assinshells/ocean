// backend/src/services/messageService.js
import Message from "../models/Message.js";
import ApiError from "../utils/ApiError.js";
import { createServiceLogger } from "../config/logger.js";
import { PAGINATION } from "../utils/constants.js";

const logger = createServiceLogger("MessageService");

class MessageService {
  async getMessages(page = 1, limit = 50) {
    const startTime = Date.now();

    try {
      // Валидация параметров
      const validPage = Math.max(1, parseInt(page, 10));
      const validLimit = Math.min(
        Math.max(1, parseInt(limit, 10)),
        PAGINATION.MAX_LIMIT
      );

      const skip = (validPage - 1) * validLimit;

      // Параллельное выполнение запросов
      const [messages, total] = await Promise.all([
        Message.find()
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(validLimit)
          .select("-__v")
          .lean()
          .exec(),
        Message.countDocuments(),
      ]);

      const totalPages = Math.ceil(total / validLimit);

      logger.debug("Messages retrieved", {
        page: validPage,
        limit: validLimit,
        total,
        duration: Date.now() - startTime,
      });

      return {
        messages: messages.reverse(), // Возвращаем в хронологическом порядке
        pagination: {
          page: validPage,
          limit: validLimit,
          total,
          pages: totalPages,
          hasNext: validPage < totalPages,
          hasPrev: validPage > 1,
        },
      };
    } catch (error) {
      logger.error("Failed to get messages", {
        error: error.message,
        stack: error.stack,
        page,
        limit,
        duration: Date.now() - startTime,
      });
      throw ApiError.internal("Failed to retrieve messages");
    }
  }

  async getMessageById(messageId) {
    const startTime = Date.now();

    try {
      // Валидация ObjectId
      if (!messageId.match(/^[0-9a-fA-F]{24}$/)) {
        throw ApiError.badRequest("Invalid message ID format");
      }

      const message = await Message.findById(messageId).select("-__v").lean();

      if (!message) {
        throw ApiError.notFound("Message not found");
      }

      logger.debug("Message retrieved", {
        messageId,
        duration: Date.now() - startTime,
      });

      return message;
    } catch (error) {
      if (error instanceof ApiError) throw error;

      logger.error("Failed to get message", {
        messageId,
        error: error.message,
        duration: Date.now() - startTime,
      });
      throw ApiError.internal("Failed to retrieve message");
    }
  }

  async deleteMessage(messageId, userId) {
    const startTime = Date.now();

    try {
      // Валидация ObjectId
      if (!messageId.match(/^[0-9a-fA-F]{24}$/)) {
        throw ApiError.badRequest("Invalid message ID format");
      }

      const message = await Message.findById(messageId);

      if (!message) {
        throw ApiError.notFound("Message not found");
      }

      // Проверка прав доступа
      if (message.senderId.toString() !== userId.toString()) {
        logger.warn("Unauthorized message deletion attempt", {
          messageId,
          userId,
          ownerId: message.senderId.toString(),
        });
        throw ApiError.forbidden("You can only delete your own messages");
      }

      await message.deleteOne();

      logger.info("Message deleted", {
        messageId,
        userId,
        duration: Date.now() - startTime,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;

      logger.error("Failed to delete message", {
        messageId,
        userId,
        error: error.message,
        duration: Date.now() - startTime,
      });
      throw ApiError.internal("Failed to delete message");
    }
  }

  // НОВЫЙ МЕТОД: Получение сообщений с фильтрацией
  async getMessagesByUser(userId, page = 1, limit = 50) {
    const startTime = Date.now();

    try {
      const validPage = Math.max(1, parseInt(page, 10));
      const validLimit = Math.min(
        Math.max(1, parseInt(limit, 10)),
        PAGINATION.MAX_LIMIT
      );

      const skip = (validPage - 1) * validLimit;

      const [messages, total] = await Promise.all([
        Message.find({ senderId: userId })
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(validLimit)
          .select("-__v")
          .lean(),
        Message.countDocuments({ senderId: userId }),
      ]);

      logger.debug("User messages retrieved", {
        userId,
        count: messages.length,
        total,
        duration: Date.now() - startTime,
      });

      return {
        messages: messages.reverse(),
        pagination: {
          page: validPage,
          limit: validLimit,
          total,
          pages: Math.ceil(total / validLimit),
        },
      };
    } catch (error) {
      logger.error("Failed to get user messages", {
        userId,
        error: error.message,
        duration: Date.now() - startTime,
      });
      throw ApiError.internal("Failed to retrieve user messages");
    }
  }
}

export default new MessageService();
