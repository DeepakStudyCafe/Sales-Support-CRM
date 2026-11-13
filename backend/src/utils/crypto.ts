import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/environment';

/**
 * Hash a plain-text password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const rounds = env.BCRYPT_ROUNDS;
  return bcrypt.hash(password, rounds);
}

/**
 * Compare a plain-text password with a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random hex token.
 * @param length Number of bytes (output length = length * 2 hex chars)
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token (for safe storage, e.g. refresh tokens in DB).
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
