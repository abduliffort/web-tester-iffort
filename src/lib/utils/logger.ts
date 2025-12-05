/**
 * Production-ready configurable logging system
 * Supports multiple log levels and can be disabled for production
 */

import { ENV_CONFIG } from "../constants";

// Log levels in order of severity
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

// Log configuration interface
interface LogConfig {
  level: LogLevel;
  enabled: boolean;
  prefix: string;
  timestamp: boolean;
}

// Default configuration
const DEFAULT_CONFIG: LogConfig = {
  level: ENV_CONFIG.NODE_ENV === "production" ? LogLevel.WARN : LogLevel.DEBUG,
  enabled: ENV_CONFIG.FEATURES.ENABLE_LOGGING,
  prefix: "[TRAI-WebTester]",
  timestamp: true,
};

class Logger {
  private config: LogConfig;
  private context: string;

  constructor(context: string = "App", config: Partial<LogConfig> = {}) {
    this.context = context;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create a new logger instance with a specific context
   */
  static create(context: string, config?: Partial<LogConfig>): Logger {
    return new Logger(context, config);
  }

  /**
   * Set the global log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return this.config.enabled && level <= this.config.level;
  }

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(level: string, message: string): string {
    const timestamp = this.config.timestamp ? new Date().toISOString() : "";
    const prefix = this.config.prefix;
    const context = this.context;

    const parts = [
      timestamp && `[${timestamp}]`,
      prefix,
      `[${level.toUpperCase()}]`,
      `[${context}]`,
      message,
    ].filter(Boolean);

    return parts.join(" ");
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const formattedMessage = this.formatMessage("error", message);

    if (error) {
      // console.error(formattedMessage, error, ...args);
    } else {
      // console.error(formattedMessage, ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.formatMessage("warn", message), ...args);
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.info(this.formatMessage("info", message), ...args);
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.debug(this.formatMessage("debug", message), ...args);
  }

  /**
   * Log a trace message (most verbose)
   */
  trace(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.TRACE)) return;
    console.trace(this.formatMessage("trace", message), ...args);
  }

  /**
   * Log test progress (special case for test logging)
   */
  progress(
    testType: string,
    threadId: number | string,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const progressMessage = `[${testType}][Thread ${threadId}] ${message}`;

    if (data) {
      this.info(progressMessage, data);
    } else {
      this.info(progressMessage);
    }
  }

  /**
   * Log KPI results (special case for results logging)
   */
  results(testType: string, results: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    this.info(`[${testType}] Test Results:`, {
      timestamp: new Date().toISOString(),
      results,
    });
  }

  /**
   * Log test phase transitions
   */
  phase(
    testType: string,
    phase: string,
    details?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const phaseMessage = `[${testType}] Phase: ${phase}`;

    if (details) {
      this.info(phaseMessage, details);
    } else {
      this.info(phaseMessage);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: string): Logger {
    return new Logger(`${this.context}:${additionalContext}`, this.config);
  }
}

// Pre-configured loggers for different modules
export const loggers = {
  // Core application logger
  app: Logger.create("App"),

  // Test-specific loggers
  download: Logger.create("Download"),
  upload: Logger.create("Upload"),
  latency: Logger.create("Latency"),
  web: Logger.create("Web"),
  streaming: Logger.create("Streaming"),

  // Infrastructure loggers
  api: Logger.create("API"),
  auth: Logger.create("Auth"),
  submission: Logger.create("Submission"),
  scenario: Logger.create("Scenario"),

  // UI loggers
  ui: Logger.create("UI"),
  components: Logger.create("Components"),

  // Utils loggers
  utils: Logger.create("Utils"),
  geo: Logger.create("Geolocation"),
  network: Logger.create("Network"),
} as const;

// Export the Logger class and default logger
export { Logger };
export const logger = loggers.app;

// Utility functions for common logging patterns
export const logTestStart = (
  testType: string,
  config: Record<string, unknown>
): void => {
  loggers[testType as keyof typeof loggers]?.info(`Starting ${testType} test`, {
    config,
    timestamp: new Date().toISOString(),
  });
};

export const logTestComplete = (
  testType: string,
  duration: number,
  results: Record<string, unknown>
): void => {
  loggers[testType as keyof typeof loggers]?.info(
    `Completed ${testType} test`,
    {
      duration: `${duration}ms`,
      results,
      timestamp: new Date().toISOString(),
    }
  );
};

export const logTestError = (
  testType: string,
  error: Error | unknown,
  context?: Record<string, unknown>
): void => {
  loggers[testType as keyof typeof loggers]?.error(
    `${testType} test failed`,
    error,
    context
  );
};

// Global error handler for unhandled errors
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    logger.error("Unhandled promise rejection", event.reason, {
      type: "unhandledrejection",
      timestamp: new Date().toISOString(),
    });
  });

  window.addEventListener("error", (event) => {
    logger.error("Unhandled error", event.error, {
      type: "error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString(),
    });
  });
}
