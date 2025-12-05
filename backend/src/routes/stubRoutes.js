import express from "express";
import { auth } from "../middlewares/auth.js";

const router = express.Router();

// Временная заглушка для /api/rooms
router.get("/rooms", auth, (req, res) => {
  req.logger.debug("Rooms endpoint called (stub)");

  res.json({
    success: true,
    data: {
      rooms: [], // Пустой список комнат
    },
  });
});

// Временная заглушка для /api/unread-count
router.get("/unread-count", auth, (req, res) => {
  req.logger.debug("Unread count endpoint called (stub)");

  res.json({
    success: true,
    data: {
      count: 0, // Нет непрочитанных сообщений
    },
  });
});

export default router;
