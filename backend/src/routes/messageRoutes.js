import express from "express";
import messageController from "../controllers/messageController.js";
import { auth } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rateLimit.js";

const router = express.Router();

router.use(auth);

// Get recent messages with pagination
router.get(
  "/",
  rateLimit({ max: 100, windowMs: 60000 }), // 100 req/min
  messageController.getMessages
);

// Get message by ID
router.get(
  "/:id",
  rateLimit({ max: 100, windowMs: 60000 }),
  messageController.getMessageById
);

// Delete message (only own messages)
router.delete(
  "/:id",
  rateLimit({ max: 50, windowMs: 60000 }),
  messageController.deleteMessage
);

export default router;
