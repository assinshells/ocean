// backend/src/models/Message.js
import mongoose from "mongoose";
import DOMPurify from "isomorphic-dompurify";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
      index: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      maxlength: [30, "Username must not exceed 30 characters"],
    },
    text: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      minlength: [1, "Message cannot be empty"],
      maxlength: [2000, "Message must not exceed 2000 characters"],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    edited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Составной индекс для эффективной пагинации
messageSchema.index({ timestamp: -1, _id: -1 });

// ✅ ИСПРАВЛЕНО: Правильный async/await без next()
messageSchema.pre("save", async function () {
  if (this.isModified("text")) {
    try {
      this.text = DOMPurify.sanitize(this.text, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
    } catch (error) {
      // В async hooks ошибки автоматически обрабатываются
      throw new Error(`Sanitization failed: ${error.message}`);
    }
  }
});

// Статические методы для получения сообщений
messageSchema.statics.getRecent = async function (limit = 50) {
  try {
    const messages = await this.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return messages.reverse(); // Возвращаем в хронологическом порядке
  } catch (error) {
    throw new Error(`Failed to get recent messages: ${error.message}`);
  }
};

// Метод пагинации с улучшенной производительностью
messageSchema.statics.paginate = async function (page = 1, limit = 50) {
  try {
    const skip = (page - 1) * limit;

    // Используем агрегацию для лучшей производительности
    const [messages, totalCount] = await Promise.all([
      this.find().sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      this.countDocuments(),
    ]);

    return {
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    throw new Error(`Pagination failed: ${error.message}`);
  }
};

export default mongoose.model("Message", messageSchema);
