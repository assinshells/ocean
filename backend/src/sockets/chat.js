import Message from "../models/Message.js";
import User from "../models/User.js";
import { verifyToken } from "../utils/token.js";

const connectedUsers = new Map();

const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error("Invalid token"));
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.user;
    console.log(`✅ User connected: ${user.username} (${socket.id})`);

    await User.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastSeen: Date.now(),
    });
    connectedUsers.set(user._id.toString(), socket.id);

    const onlineUsers = await User.find({ isOnline: true }).select(
      "username isOnline lastSeen"
    );
    io.emit("users:online", onlineUsers);

    const recentMessages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    socket.emit("messages:history", recentMessages.reverse());

    socket.on("message:send", async (data) => {
      try {
        const message = new Message({
          senderId: user._id,
          username: user.username,
          text: data.text,
          timestamp: new Date(),
        });

        await message.save();

        io.emit("message:new", {
          _id: message._id,
          senderId: message.senderId,
          username: message.username,
          text: message.text,
          timestamp: message.timestamp,
        });
      } catch (error) {
        console.error("Message send error:", error);
        socket.emit("error", { message: "Ошибка отправки сообщения" });
      }
    });

    socket.on("typing:start", () => {
      socket.broadcast.emit("user:typing", { username: user.username });
    });

    socket.on("typing:stop", () => {
      socket.broadcast.emit("user:stopped-typing", { username: user.username });
    });

    socket.on("disconnect", async () => {
      console.log(`❌ User disconnected: ${user.username} (${socket.id})`);

      await User.findByIdAndUpdate(user._id, {
        isOnline: false,
        lastSeen: Date.now(),
      });

      connectedUsers.delete(user._id.toString());

      const onlineUsers = await User.find({ isOnline: true }).select(
        "username isOnline lastSeen"
      );
      io.emit("users:online", onlineUsers);
    });
  });
};

export default initializeSocket;
