/**
 * Safe error handling utility
 * Prevents information leakage in production
 */

import { config } from '../config';

/**
 * Sanitizes error messages for API responses
 * In production, returns generic messages to prevent information leakage
 * In development, returns the actual error message for debugging
 */
export const sanitizeErrorMessage = (error: unknown, defaultMessage: string = 'Erro interno do servidor'): string => {
  if (config.nodeEnv === 'development') {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  // In production, always return the safe default message
  return defaultMessage;
};

/**
 * Gets error message for logging (always returns actual message)
 * Use this for internal logging, never for API responses
 */
export const getErrorForLogging = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

/**
 * Standard error response format
 */
export interface SafeErrorResponse {
  error: string;
  details?: string;
}

/**
 * Creates a safe error response object
 */
export const createSafeErrorResponse = (
  error: unknown,
  defaultMessage: string
): SafeErrorResponse => {
  const response: SafeErrorResponse = {
    error: sanitizeErrorMessage(error, defaultMessage)
  };

  // Only include details in development
  if (config.nodeEnv === 'development' && error instanceof Error) {
    response.details = error.stack;
  }

  return response;
};
