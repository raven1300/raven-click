// Signed login cookie for the training section.
// Uses only Web Crypto, so it runs in both Netlify Functions (Node) and Edge Functions (Deno).

export const COOKIE = 'training_session';
export const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = str => {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
};

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toB64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// payload: { pid, v } plus an expiry added here.
export async function signSession(payload, secret) {
  const body = toB64url(enc.encode(JSON.stringify({ ...payload, exp: Date.now() + MAX_AGE_SECONDS * 1000 })));
  return `${body}.${await hmac(secret, body)}`;
}

// Returns the payload, or null if the token is missing, tampered with or expired.
export async function verifySession(token, secret) {
  if (!token || !secret) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || !sameString(sig, await hmac(secret, body))) return null;
  try {
    const payload = JSON.parse(dec.decode(fromB64url(body)));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function readCookie(request, name = COOKIE) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

export const sessionCookie = token => `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
export const clearedCookie = () => `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
