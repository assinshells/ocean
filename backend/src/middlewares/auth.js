import { verifyToken } from "../utils/token.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Токен не предоставлен");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      throw ApiError.unauthorized("Недействительный или истёкший токен");
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      throw ApiError.unauthorized("Пользователь не найден");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
