/**
 * Structured logging utility for Nirmit.
 *
 * In production, logs go to console. The interface is designed to be
 * swapped for Sentry, DataDog, or any external logging service without
 * changing call sites.
 *
 * Usage:
 *   import { logError, logWarn, logInfo } from '../lib/logger';
 *   logError('Viewer3D', error, { modelPath: item.modelPath });
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  metadata?: Record<string, unknown>;
  errorStack?: string;
}

/** Maximum number of log entries to keep in memory for diagnostics */
const MAX_BUFFER = 200;
const logBuffer: LogEntry[] = [];

function createEntry(
  level: LogLevel,
  context: string,
  message: string,
  metadata?: Record<string, unknown>,
  errorStack?: string,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    metadata,
    errorStack,
  };
}

function pushEntry(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER) {
    logBuffer.shift();
  }
}

function formatConsole(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    `[${entry.context}]`,
    entry.message,
  ];
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    parts.push(JSON.stringify(entry.metadata));
  }
  return parts.join(' ');
}

/**
 * Log an error with context and optional metadata.
 * In production, this would also send to Sentry/DataDog.
 */
export function logError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>,
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const entry = createEntry('error', context, message, metadata, stack);
  pushEntry(entry);

  if (import.meta.env.DEV) {
    console.error(formatConsole(entry));
    if (stack) {
      console.error(stack);
    }
  } else {
    // Production: structured logging ready for external service
    console.error(JSON.stringify(entry));
  }
}

/**
 * Log a warning with context and optional metadata.
 */
export function logWarn(
  context: string,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  const entry = createEntry('warn', context, message, metadata);
  pushEntry(entry);

  if (import.meta.env.DEV) {
    console.warn(formatConsole(entry));
  } else {
    console.warn(JSON.stringify(entry));
  }
}

/**
 * Log an informational message with context and optional metadata.
 */
export function logInfo(
  context: string,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  const entry = createEntry('info', context, message, metadata);
  pushEntry(entry);

  if (import.meta.env.DEV) {
    console.info(formatConsole(entry));
  } else {
    console.info(JSON.stringify(entry));
  }
}

/**
 * Log a debug message (only in development).
 */
export function logDebug(
  context: string,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  if (!import.meta.env.DEV) return;
  const entry = createEntry('debug', context, message, metadata);
  pushEntry(entry);
  console.debug(formatConsole(entry));
}

/**
 * Return a copy of the in-memory log buffer for diagnostics.
 */
export function getLogBuffer(): readonly LogEntry[] {
  return [...logBuffer];
}

/**
 * Clear the in-memory log buffer.
 */
export function clearLogBuffer(): void {
  logBuffer.length = 0;
}

/**
 * Performance measurement helper.
 * Usage:
 *   const end = startPerf('ai-generation');
 *   // ... work ...
 *   end();
 */
export function startPerf(label: string): () => void {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    logInfo('perf', `${label} completed`, { durationMs: Math.round(duration) });
    if (duration > 3000) {
      logWarn('perf', `Slow operation: ${label}`, { durationMs: Math.round(duration) });
    }
  };
}