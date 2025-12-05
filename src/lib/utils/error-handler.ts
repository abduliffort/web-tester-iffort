/**
 * Production-ready error handling and validation system
 * Provides standardized error types and handling patterns
 */

import { loggers } from './logger';

// Standard error types for the application
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  TEST_ERROR = 'TEST_ERROR',
  API_ERROR = 'API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Base error class with structured information
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly recoverable: boolean;

  constructor(
    type: ErrorType,
    message: string,
    code: string,
    recoverable: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.recoverable = recoverable;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Create a serializable object for logging or API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      type: this.type,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
      context: this.context,
      stack: this.stack,
    };
  }
}

// Specific error classes for different scenarios
export class NetworkError extends AppError {
  constructor(message: string, code: string = 'NETWORK_FAILURE', context?: Record<string, unknown>) {
    super(ErrorType.NETWORK_ERROR, message, code, true, context);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends AppError {
  constructor(message: string, code: string = 'TIMEOUT', context?: Record<string, unknown>) {
    super(ErrorType.TIMEOUT_ERROR, message, code, true, context);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_FAILED', context?: Record<string, unknown>) {
    super(ErrorType.VALIDATION_ERROR, message, code, false, context);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, code: string = 'CONFIG_ERROR', context?: Record<string, unknown>) {
    super(ErrorType.CONFIGURATION_ERROR, message, code, false, context);
    this.name = 'ConfigurationError';
  }
}

export class TestError extends AppError {
  constructor(message: string, code: string = 'TEST_FAILED', context?: Record<string, unknown>) {
    super(ErrorType.TEST_ERROR, message, code, true, context);
    this.name = 'TestError';
  }
}

export class ApiError extends AppError {
  public readonly statusCode?: number;

  constructor(
    message: string, 
    statusCode?: number, 
    code: string = 'API_ERROR', 
    context?: Record<string, unknown>
  ) {
    super(ErrorType.API_ERROR, message, code, true, context);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
    };
  }
}

// Error handler utility class
export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle any error with appropriate logging and formatting
   */
  public handle(error: unknown, context?: Record<string, unknown>): AppError {
    const logger = loggers.utils;

    // If it's already an AppError, just log and return
    if (error instanceof AppError) {
      logger.error(`${error.type}: ${error.message}`, error, context);
      return error;
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      let appError: AppError;

      // Classify error based on message or type
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        appError = new TimeoutError(error.message, 'REQUEST_TIMEOUT', { 
          originalError: error.name,
          ...context 
        });
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        appError = new NetworkError(error.message, 'NETWORK_FAILURE', { 
          originalError: error.name,
          ...context 
        });
      } else {
        appError = new AppError(
          ErrorType.UNKNOWN_ERROR,
          error.message,
          'UNKNOWN_ERROR',
          false,
          { originalError: error.name, ...context }
        );
      }

      logger.error(`Converted error: ${appError.type}`, appError, context);
      return appError;
    }

    // Handle string errors
    if (typeof error === 'string') {
      const appError = new AppError(
        ErrorType.UNKNOWN_ERROR,
        error,
        'STRING_ERROR',
        false,
        context
      );
      logger.error('String error converted', appError, context);
      return appError;
    }

    // Handle unknown error types
    const appError = new AppError(
      ErrorType.UNKNOWN_ERROR,
      'An unknown error occurred',
      'UNKNOWN_TYPE',
      false,
      { originalError: String(error), ...context }
    );
    logger.error('Unknown error type', appError, context);
    return appError;
  }

  /**
   * Wrap async functions with error handling
   */
  public async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handle(error, context);
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  public async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    context?: Record<string, unknown>
  ): Promise<T> {
    const logger = loggers.utils;
    let lastError: AppError | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          logger.info(`Operation succeeded on attempt ${attempt}`, { 
            attempt, 
            maxAttempts,
            ...context 
          });
        }
        return result;
      } catch (error) {
        lastError = this.handle(error, { 
          attempt, 
          maxAttempts,
          ...context 
        });

        if (attempt === maxAttempts || !lastError.recoverable) {
          logger.error(`Operation failed after ${attempt} attempts`, lastError);
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.warn(`Retrying operation in ${delay}ms (attempt ${attempt}/${maxAttempts})`, {
          error: lastError.message,
          delay,
          attempt,
          maxAttempts,
          ...context
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

// Validation utilities
export class Validator {
  /**
   * Validate required fields in an object
   */
  public static validateRequired(
    obj: Record<string, unknown>,
    requiredFields: string[],
    context?: string
  ): void {
    const missing = requiredFields.filter(field => 
      obj[field] === undefined || obj[field] === null || obj[field] === ''
    );

    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missing.join(', ')}`,
        'MISSING_FIELDS',
        { missing, context, provided: Object.keys(obj) }
      );
    }
  }

  /**
   * Validate numeric ranges
   */
  public static validateRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): void {
    if (value < min || value > max) {
      throw new ValidationError(
        `${fieldName} must be between ${min} and ${max}, got ${value}`,
        'OUT_OF_RANGE',
        { value, min, max, fieldName }
      );
    }
  }

  /**
   * Validate URL format
   */
  public static validateUrl(url: string, fieldName: string = 'URL'): void {
    try {
      new URL(url);
    } catch {
      throw new ValidationError(
        `Invalid ${fieldName}: ${url}`,
        'INVALID_URL',
        { url, fieldName }
      );
    }
  }

  /**
   * Validate array length
   */
  public static validateArrayLength(
    array: unknown[],
    minLength: number,
    maxLength: number,
    fieldName: string
  ): void {
    if (array.length < minLength || array.length > maxLength) {
      throw new ValidationError(
        `${fieldName} must have between ${minLength} and ${maxLength} items, got ${array.length}`,
        'INVALID_ARRAY_LENGTH',
        { length: array.length, minLength, maxLength, fieldName }
      );
    }
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions for common error scenarios
export const createNetworkError = (message: string, context?: Record<string, unknown>) =>
  new NetworkError(message, 'NETWORK_FAILURE', context);

export const createTimeoutError = (message: string, context?: Record<string, unknown>) =>
  new TimeoutError(message, 'TIMEOUT', context);

export const createValidationError = (message: string, context?: Record<string, unknown>) =>
  new ValidationError(message, 'VALIDATION_FAILED', context);

export const createConfigError = (message: string, context?: Record<string, unknown>) =>
  new ConfigurationError(message, 'CONFIG_ERROR', context);

export const createTestError = (message: string, context?: Record<string, unknown>) =>
  new TestError(message, 'TEST_FAILED', context);

export const createApiError = (
  message: string, 
  statusCode?: number, 
  context?: Record<string, unknown>
) => new ApiError(message, statusCode, 'API_ERROR', context);