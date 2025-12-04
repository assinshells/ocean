import express from "express";
import userController from "../controllers/userController.js";
import { auth } from "../middlewares/auth.js";

const router = express.Router();

router.use(auth);

router.get("/me", userController.getProfile);
router.get("/online", userController.getOnlineUsers);
router.get("/all", userController.getAllUsers);

export default router;
