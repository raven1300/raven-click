// Responses and login checks shared by the training API functions.
import { readCookie, verifySession } from './session.js';
import { loadPeople, useDeployContext } from './store.js';
import { adminVersion } from './passwords.js';

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

export const fail = (status, message, extra = {}) => json({ message, ...extra }, status);

export function settings() {
  const secret = process.env.TRAINING_SESSION_SECRET;
  const adminPassword = process.env.TRAINING_ADMIN_PASSWORD;
  if (!secret || !adminPassword) return null;
  return { secret, adminPassword };
}

export const notSetUp = () => fail(500, 'Training isn\'t set up yet. TRAINING_SESSION_SECRET and TRAINING_ADMIN_PASSWORD need adding in Netlify.');

// Returns { id, person, people } for a valid, unpaused login, or a Response to send back.
export async function currentUser(req) {
  const config = settings();
  if (!config) return notSetUp();
  const payload = await verifySession(readCookie(req), config.secret);
  if (!payload) return fail(401, 'Please log in.');
  const people = await loadPeople();
  const person = people[payload.pid];
  if (!person) return fail(401, 'Please log in.');
  const expected = person.admin ? adminVersion(config.adminPassword) : person.v;
  if (payload.v !== expected) return fail(401, 'Please log in again.');
  if (person.paused) return fail(403, 'Your access is paused. Ask Nick.', { paused: true });
  return { id: payload.pid, person, people };
}

export async function adminUser(req) {
  const user = await currentUser(req);
  if (user instanceof Response) return user;
  return user.person.admin ? user : fail(403, 'Only Nick can do that.');
}

export async function body(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

// Thrown inside update() callbacks to stop and report a problem to the user.
export class UserError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Every training function runs through this, which also picks the live or preview store.
export async function handle(fn, context) {
  useDeployContext(context);
  try {
    return await fn();
  } catch (err) {
    if (err instanceof UserError) return fail(err.status, err.message);
    console.error(err);
    return fail(500, 'Something went wrong on the server. Please try again.');
  }
}
