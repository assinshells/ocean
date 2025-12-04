import nodemailer from "nodemailer";
import env from "./env.js";
import logger from "./logger.js";

const createTransporter = () => {
  if (env.NODE_ENV === "production") {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  // Development - mailhog or similar
  return nodemailer.createTransport({
    host: "localhost",
    port: 1025,
    ignoreTLS: true,
  });
};

let transporter = null;

export const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();

    // Verify connection
    transporter.verify((error) => {
      if (error) {
        logger.error("Mail transporter error", { error: error.message });
      } else {
        logger.info("Mail server ready");
      }
    });
  }

  return transporter;
};

export { transporter };
