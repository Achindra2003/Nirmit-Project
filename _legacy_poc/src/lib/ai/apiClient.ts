/**
 * Nirmit API Client — Shared fetch wrapper with retry, timeout, and error handling.
 *
 * Used by all AI service files (layoutService, materialService, scopeService)
 * to ensure consistent error handling, retry logic, and timeout behavior.
 */

// ─────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────

export class ApiError extends Error {
  public readonly status: number;
  public readonly retryable: boolean;

  constructor(status: number, message: string, retryable: boolean) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryable = retryable;
  }
}

// ─────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay in milliseconds before first retry (default: 1000) */
  baseDelay: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  timeout: 30000,
};

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

/** Determine if an HTTP status code is retryable */
function isRetryableStatus(status: number): boolean {
  // 429 = rate limited, 5xx = server errors — all retryable
  // 401/403 = auth errors — not retryable (key is invalid)
  // 4xx (except 429) = client errors — not retryable
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

/** Calculate exponential backoff delay with jitter */
function getBackoffDelay(attempt: number, baseDelay: number): number {
  // Exponential: baseDelay * 2^attempt
  const exponential = baseDelay * Math.pow(2, attempt);
  // Add jitter: ±25% random variation to prevent thundering herd
  const jitter = exponential * 0.25 * (Math.random() * 2 - 1);
  return Math.round(exponential + jitter);
}

/** Sleep for a given number of milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────
// Core: fetchWithRetry
// ─────────────────────────────────────────────────

/**
 * Fetch wrapper with automatic retry, exponential backoff, and timeout.
 *
 * @param url - The URL to fetch
 * @param options - Standard fetch RequestInit options
 * @param config - Optional retry/timeout configuration
 * @returns The fetch Response object
 * @throws {ApiError} On non-retryable errors or after exhausting retries
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: Partial<RetryConfig> = {},
): Promise<Response> {
  const { maxRetries, baseDelay, timeout } = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Merge the abort signal with any existing signal
      const existingSignal = options.signal;
      if (existingSignal) {
        existingSignal.addEventListener('abort', () => controller.abort());
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check for HTTP errors
      if (!response.ok) {
        const status = response.status;
        const retryable = isRetryableStatus(status);

        // Log appropriate warnings
        if (status === 401 || status === 403) {
          console.warn(
            '[Nirmit API] Authentication failed — your API key may be invalid or expired. ' +
            'Set VITE_GROQ_API_KEY in your .env file.',
          );
        } else if (status === 429) {
          console.warn(
            `[Nirmit API] Rate limited (attempt ${attempt + 1}/${maxRetries + 1}) — backing off...`,
          );
        } else if (status >= 500) {
          console.warn(
            `[Nirmit API] Server error ${status} (attempt ${attempt + 1}/${maxRetries + 1})`,
          );
        }

        const error = new ApiError(status, `HTTP ${status}`, retryable);

        if (!retryable || attempt >= maxRetries) {
          throw error;
        }

        lastError = error;
      } else {
        // Success — return the response
        return response;
      }
    } catch (err) {
      // Don't retry if it's already an ApiError that's non-retryable
      if (err instanceof ApiError && !err.retryable) {
        throw err;
      }

      // Handle AbortError (timeout)
      if (err instanceof DOMException && err.name === 'AbortError') {
        const timeoutError = new ApiError(0, 'Request timed out', true);
        if (attempt >= maxRetries) {
          throw timeoutError;
        }
        lastError = timeoutError;
        console.warn(
          `[Nirmit API] Request timed out after ${timeout}ms (attempt ${attempt + 1}/${maxRetries + 1})`,
        );
      } else if (err instanceof TypeError && err.message === 'Failed to fetch') {
        // Network error (offline, DNS failure, etc.)
        const networkError = new ApiError(0, 'Network error — check your connection', true);
        if (attempt >= maxRetries) {
          throw networkError;
        }
        lastError = networkError;
        console.warn(
          `[Nirmit API] Network error (attempt ${attempt + 1}/${maxRetries + 1})`,
        );
      } else if (!(err instanceof ApiError)) {
        // Unknown error
        if (attempt >= maxRetries) {
          throw err;
        }
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    // Calculate backoff delay before retrying
    if (attempt < maxRetries) {
      const delay = getBackoffDelay(attempt, baseDelay);
      await sleep(delay);
    }
  }

  // Exhausted all retries
  throw lastError ?? new ApiError(0, 'Max retries exhausted', false);
}

/**
 * Convenience wrapper: fetch JSON with retry and status checking.
 *
 * @param url - The URL to fetch
 * @param options - Standard fetch RequestInit options
 * @param config - Optional retry/timeout configuration
 * @returns Parsed JSON response body
 * @throws {ApiError} On HTTP errors or after exhausting retries
 */
export async function fetchJSONWithRetry<T = unknown>(
  url: string,
  options: RequestInit = {},
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const response = await fetchWithRetry(url, options, config);
  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────
// Shared API Constants
// ─────────────────────────────────────────────────

export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_API_KEY: string = import.meta.env.VITE_GROQ_API_KEY || '';
export const GROQ_MODEL = 'kimi-k2-instruct';
