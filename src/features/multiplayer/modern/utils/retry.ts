import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: string[];
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryableErrors = [
      'unavailable',
      'deadline-exceeded', 
      'resource-exhausted',
      'cancelled',
      'network-error',
      'timeout'
    ]
  } = options;

  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = retryableErrors.some(code => 
        error.code === code || 
        error.message?.toLowerCase().includes(code) ||
        error.name?.toLowerCase().includes(code)
      );
      
      // Don't retry on last attempt or non-retryable errors
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Calculate delay with exponential backoff + jitter
      const baseDelayMs = baseDelay * Math.pow(backoffFactor, attempt);
      const jitter = Math.random() * 0.3 * baseDelayMs; // ±30% jitter
      const delay = Math.min(baseDelayMs + jitter, maxDelay);
      
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`, {
        error: error.message,
        code: error.code,
        name: error.name
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Pre-configured retry strategies for different operations
export const retryStrategies = {
  // For critical operations like submitting answers
  critical: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 10000,
    backoffFactor: 1.5,
    retryableErrors: ['unavailable', 'deadline-exceeded', 'cancelled', 'network-error', 'timeout']
  },
  
  // For standard operations like creating/joining rooms
  standard: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryableErrors: ['unavailable', 'deadline-exceeded', 'network-error']
  },
  
  // For non-critical operations
  nonCritical: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryableErrors: ['unavailable', 'network-error']
  }
};
