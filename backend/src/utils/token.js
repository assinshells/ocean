import jwt from "jsonwebtoken";
import crypto from "crypto";
import env from "../config/env.js";

export const generateToken = (userId) => {
  return jwt.sign({ userId: userId.toString() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Генерация случайного токена для сброса пароля
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Хеширование reset токена для безопасного хранения в БД
export const hashResetToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
