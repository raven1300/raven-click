// Friends' passwords are stored as PBKDF2 hashes. Nick's admin password lives in a Netlify setting.
import { createHash, pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(pbkdf2);
const ITERATIONS = 100000;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64');
  const hash = (await derive(password, salt, ITERATIONS, 32, 'sha256')).toString('base64');
  return { salt, hash };
}

export async function checkPassword(password, { salt, hash }) {
  if (!salt || !hash) return false;
  const attempt = await derive(password, salt, ITERATIONS, 32, 'sha256');
  const stored = Buffer.from(hash, 'base64');
  return stored.length === attempt.length && timingSafeEqual(stored, attempt);
}

const digest = text => createHash('sha256').update(text).digest();

export function sameSecret(a, b) {
  return timingSafeEqual(digest(a), digest(b));
}

// Changes whenever the admin password setting changes, which logs the admin out everywhere.
export function adminVersion(adminPassword) {
  return digest(`admin:${adminPassword}`).toString('hex').slice(0, 12);
}
