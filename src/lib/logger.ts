type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
  id: string;
  level: LogLevel;
  scope: string;
  message: string;
  data?: unknown;
  timestamp: number;
};

const LOG_LIMIT = 20;
const logBuffer: LogEntry[] = [];
const listeners = new Set<() => void>();

function isDebugEnabled() {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  const apiDebug = process.env.EXPO_PUBLIC_API_DEBUG === '1';
  return isDev || apiDebug;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function pushLog(entry: LogEntry) {
  if (!isDebugEnabled()) return;
  logBuffer.push(entry);
  if (logBuffer.length > LOG_LIMIT) {
    logBuffer.shift();
  }
  notify();
}

export function getLogs() {
  return [...logBuffer];
}

export function clearLogs() {
  logBuffer.length = 0;
  notify();
}

export function subscribeLogs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function formatPrefix(scope: string) {
  return `[${scope}]`;
}

export function createLogger(scope: string) {
  const emit = (level: LogLevel, message: string, data?: unknown) => {
    if (!isDebugEnabled()) return;
    const timestamp = Date.now();
    const entry: LogEntry = {
      id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      scope,
      message,
      data,
      timestamp,
    };
    pushLog(entry);
    const prefix = formatPrefix(scope);
    if (level === 'warn') {
      console.warn(prefix, message, data ?? '');
      return;
    }
    if (level === 'error') {
      console.error(prefix, message, data ?? '');
      return;
    }
    console.log(prefix, message, data ?? '');
  };

  return {
    debug: (message: string, data?: unknown) => emit('debug', message, data),
    info: (message: string, data?: unknown) => emit('info', message, data),
    warn: (message: string, data?: unknown) => emit('warn', message, data),
    error: (message: string, data?: unknown) => emit('error', message, data),
  };
}
