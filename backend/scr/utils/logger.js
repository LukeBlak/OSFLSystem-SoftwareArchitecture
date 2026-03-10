import { isDevelopment } from '../config/env.js';

const timestamp = () => new Date().toISOString();

export const logger = {
  info: (msg, ...args) => console.log(`[${timestamp()}] INFO:`, msg, ...args),
  warn: (msg, ...args) => console.warn(`[${timestamp()}] WARN:`, msg, ...args),
  error: (msg, ...args) => console.error(`[${timestamp()}] ERROR:`, msg, ...args),
  debug: (msg, ...args) => {
    if (isDevelopment) console.debug(`[${timestamp()}] DEBUG:`, msg, ...args);
  },
};
