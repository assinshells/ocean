class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      message,
      ...data,
    };
  }

  info(message, data) {
    if (this.isDevelopment) {
      console.log(
        `%c[INFO] ${message}`,
        "color: #3498db",
        this.formatMessage("INFO", message, data)
      );
    }
  }

  error(message, data) {
    console.error(
      `%c[ERROR] ${message}`,
      "color: #e74c3c",
      this.formatMessage("ERROR", message, data)
    );
  }

  warn(message, data) {
    if (this.isDevelopment) {
      console.warn(
        `%c[WARN] ${message}`,
        "color: #f39c12",
        this.formatMessage("WARN", message, data)
      );
    }
  }

  debug(message, data) {
    if (this.isDevelopment) {
      console.debug(
        `%c[DEBUG] ${message}`,
        "color: #9b59b6",
        this.formatMessage("DEBUG", message, data)
      );
    }
  }
}

export default new Logger();
