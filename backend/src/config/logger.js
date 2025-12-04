import env from "./env.js";

class Logger {
  constructor() {
    this.isDevelopment = env.NODE_ENV === "development";
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  }

  info(message, meta) {
    console.log(this.formatMessage("INFO", message, meta));
  }

  error(message, meta) {
    console.error(this.formatMessage("ERROR", message, meta));
  }

  warn(message, meta) {
    console.warn(this.formatMessage("WARN", message, meta));
  }

  debug(message, meta) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage("DEBUG", message, meta));
    }
  }
}

export default new Logger();
