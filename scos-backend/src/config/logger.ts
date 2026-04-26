type LogMeta = Record<string, unknown>;

const now = () => new Date().toISOString();

function write(level: string, message: string, meta?: LogMeta): void {
  const payload = {
    timestamp: now(),
    level,
    message,
    ...(meta ? { meta } : {})
  };

  if (level === 'error') {
    console.error(JSON.stringify(payload));
    return;
  }

  console.log(JSON.stringify(payload));
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
  debug: (message: string, meta?: LogMeta) => write('debug', message, meta)
};
