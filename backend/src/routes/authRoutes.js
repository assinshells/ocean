import express from "express";
import authController from "../controllers/authController.js";
import { auth } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rateLimit.js";
import {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../utils/validators.js";

const router = express.Router();

router.post(
  "/register",
  rateLimit({ max: 5, windowMs: 15 * 60 * 1000 }),
  validate(registerSchema),
  authController.register
);

router.post(
  "/login",
  rateLimit({ max: 10, windowMs: 15 * 60 * 1000 }),
  validate(loginSchema),
  authController.login
);

router.get("/verify", auth, authController.verifyToken);

router.post(
  "/forgot-password",
  rateLimit({ max: 3, windowMs: 15 * 60 * 1000 }),
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  "/reset-password",
  rateLimit({ max: 5, windowMs: 15 * 60 * 1000 }),
  validate(resetPasswordSchema),
  authController.resetPassword
);

export default router;
