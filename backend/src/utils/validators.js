import Joi from "joi";

export const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    "string.min": "Имя пользователя должно содержать минимум 3 символа",
    "string.max": "Имя пользователя должно содержать максимум 30 символов",
    "any.required": "Имя пользователя обязательно",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Пароль должен содержать минимум 6 символов",
    "any.required": "Пароль обязателен",
  }),
  email: Joi.string().email().optional().allow("").messages({
    "string.email": "Некорректный email",
  }),
});

export const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    "any.required": "Имя пользователя обязательно",
  }),
  password: Joi.string().required().messages({
    "any.required": "Пароль обязателен",
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Некорректный email",
    "any.required": "Email обязателен",
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(6).required().messages({
    "string.min": "Пароль должен содержать минимум 6 символов",
    "any.required": "Новый пароль обязателен",
  }),
});

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    next();
  };
};
