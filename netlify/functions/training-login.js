import { body, fail, handle, json, notSetUp, settings } from '../lib/training/http.js';
import { adminVersion, checkPassword, sameSecret } from '../lib/training/passwords.js';
import { clearedCookie, sessionCookie, signSession } from '../lib/training/session.js';
import { loadPeople, store, update } from '../lib/training/store.js';

const MAX_TRIES = 5;
const LOCKOUT_MINUTES = 10;

export default async (req, context) => handle(async () => {
  if (req.method === 'DELETE') return json({ ok: true }, 200, { 'Set-Cookie': clearedCookie() });
  if (req.method !== 'POST') return fail(405, 'Use POST to log in.');
  const config = settings();
  if (!config) return notSetUp();

  const lockKey = `lockouts/${context.ip || 'unknown'}`;
  const lock = await store().get(lockKey, { type: 'json' });
  if (lock?.until > Date.now()) {
    const minutes = Math.ceil((lock.until - Date.now()) / 60000);
    return fail(429, `Too many wrong tries. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
  }

  const password = String((await body(req)).password || '').trim();
  let pid = null;
  let version = null;
  if (password && sameSecret(password, config.adminPassword)) {
    // The admin's record is created on first login. Nick can rename it later.
    const people = (await update('people', () => ({ people: {} }), data => {
      if (!data.people.admin) data.people.admin = { name: 'Nick', admin: true };
      return data;
    })).people;
    pid = 'admin';
    version = adminVersion(config.adminPassword);
    if (!people.admin) return fail(500, 'Couldn\'t set up the admin account.');
  } else if (password) {
    const people = await loadPeople();
    for (const [id, person] of Object.entries(people)) {
      if (!person.admin && await checkPassword(password, person)) {
        if (person.paused) return fail(403, 'Your access is paused. Ask Nick.', { paused: true });
        pid = id;
        version = person.v;
        break;
      }
    }
  }

  if (!pid) {
    const fails = (lock?.fails || 0) + 1;
    await store().setJSON(lockKey, fails >= MAX_TRIES ? { fails: 0, until: Date.now() + LOCKOUT_MINUTES * 60000 } : { fails, until: 0 });
    return fail(401, fails >= MAX_TRIES ? `That password isn't right. Too many wrong tries, so wait ${LOCKOUT_MINUTES} minutes.` : 'That password isn\'t right.');
  }

  if (lock) await store().delete(lockKey);
  const token = await signSession({ pid, v: version }, config.secret);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token) });
}, context);

export const config = { path: '/api/training/login' };
