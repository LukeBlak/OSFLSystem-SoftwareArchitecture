import { randomBytes } from 'crypto';

export const generateToken = (bytes = 32) =>
  randomBytes(bytes).toString('hex');
