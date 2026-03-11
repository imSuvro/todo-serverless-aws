export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  requestId?: string;
  todoId?: string;
  [key: string]: unknown;
}

export function log(
  level: LogLevel,
  message: string,
  meta: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp' | 'service'>> = {}
): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'task-processing-service',
    ...meta,
  };
  console.log(JSON.stringify(entry));
}
