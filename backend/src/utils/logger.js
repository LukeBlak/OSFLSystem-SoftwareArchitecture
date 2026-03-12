const levels = {
  error: '❌',
  warn: '⚠️ ',
  info: 'ℹ️ ',
  http: '🌐 ',
  debug: '🐛 ',
};

const colors = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  http: '\x1b[32m',
  debug: '\x1b[35m',
  reset: '\x1b[0m',
};

const log = (level, message, meta = {}) => {
  const emoji = levels[level] || '•';
  const color = colors[level] || colors.reset;
  const timestamp = new Date().toISOString();
  
  console.log(
    `${color}${emoji} [${timestamp}] ${level.toUpperCase()}:${colors.reset} ${message}`,
    Object.keys(meta).length ? meta : ''
  );
};

export const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  http: (message, meta) => log('http', message, meta),
  debug: (message, meta) => log('debug', message, meta),
};