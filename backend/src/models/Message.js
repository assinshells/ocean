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

// Составной индекс для пагинации
messageSchema.index({ timestamp: -1, _id: -1 });

// ✅ ИСПРАВЛЕНО: Убрано логирование, которое вызывало ошибку
messageSchema.pre("save", function (next) {
  try {
    if (this.isModified("text")) {
      this.text = DOMPurify.sanitize(this.text, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
    }
    next();
  } catch (error) {
    // ✅ Простой console.error вместо logger
    console.error("Error in message pre-save hook:", error.message);
    next(error);
  }
});

// Статический метод для получения последних сообщений
messageSchema.statics.getRecent = function (limit = 50) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean()
    .then((messages) => messages.reverse())
    .catch((error) => {
      console.error("Error getting recent messages:", error.message);
      throw error;
    });
};

// Статический метод для пагинации
messageSchema.statics.paginate = function (page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  return this.find()
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .then((messages) => messages.reverse())
    .catch((error) => {
      console.error("Error paginating messages:", error.message);
      throw error;
    });
};

export default mongoose.model("Message", messageSchema);
