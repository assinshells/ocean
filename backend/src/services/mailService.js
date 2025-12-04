import { transporter } from "../config/mail.js";

class MailService {
  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || "noreply@chatapp.com",
      to: email,
      subject: "Сброс пароля",
      html: `
        <h1>Вы запросили сброс пароля</h1>
        <p>Перейдите по ссылке ниже, чтобы сбросить пароль:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
        <p>Ссылка действительна в течение 1 часа.</p>
      `,
    };

    if (process.env.NODE_ENV === "development") {
      console.log("📧 Email отправлен (DEV MODE):");
      console.log("To:", email);
      console.log("Reset URL:", resetUrl);
      console.log("Token:", resetToken);
      return { success: true, mode: "development" };
    }

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error("Email sending error:", error);
      throw error;
    }
  }
}

export default new MailService();
