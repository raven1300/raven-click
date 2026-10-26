import { adminUser, body, currentUser, fail, handle, json, settings, UserError } from '../lib/training/http.js';
import { checkPassword, hashPassword, sameSecret } from '../lib/training/passwords.js';
import { blocksKey, hasLoggedSets, slug, store, update } from '../lib/training/store.js';

// Everyone sees names (for browsing each other's history). Only the admin sees who's paused
// and who has history, which decides whether they can be removed.
const listFor = (people, isAdmin) => Promise.all(Object.entries(people).map(async ([id, p]) => ({
  id,
  name: p.name,
  admin: !!p.admin,
  ...(isAdmin ? { paused: !!p.paused, hasHistory: await hasLoggedSets(id) } : {}),
})));

async function checkPasswordFree(people, password, exceptId) {
  if (password.length < 4) throw new UserError(400, 'Use at least 4 characters.');
  if (sameSecret(password, settings().adminPassword)) throw new UserError(409, 'Someone already has that password. Choose a different one.');
  for (const [id, p] of Object.entries(people)) {
    if (id !== exceptId && !p.admin && await checkPassword(password, p)) throw new UserError(409, 'Someone already has that password. Choose a different one.');
  }
}

function checkNameFree(people, name, exceptId) {
  if (!name) throw new UserError(400, 'Enter a name.');
  if (name.length > 30) throw new UserError(400, 'Keep names to 30 characters.');
  if (Object.entries(people).some(([id, p]) => id !== exceptId && p.name.toLowerCase() === name.toLowerCase())) throw new UserError(409, `There's already someone called ${name}.`);
}

export default async (req) => handle(async () => {
  if (req.method === 'GET') {
    const user = await currentUser(req);
    if (user instanceof Response) return user;
    return json({ people: await listFor(user.people, !!user.person.admin) });
  }
  if (req.method !== 'POST') return fail(405, 'Use GET or POST.');

  const user = await adminUser(req);
  if (user instanceof Response) return user;
  const input = await body(req);
  const name = String(input.name || '').trim();
  const password = String(input.password || '').trim();
  let message = '';

  // Only someone with no logged sets can be removed, so no training history is ever lost.
  if (input.action === 'remove' && await hasLoggedSets(input.id)) {
    return fail(409, 'They have logged sets, so they can only be paused.');
  }

  const data = await update('people', () => ({ people: {} }), async current => {
    const people = current.people;
    const target = input.id ? people[input.id] : null;
    if (input.action !== 'add' && !target) throw new UserError(404, 'That person no longer exists.');

    if (input.action === 'add') {
      checkNameFree(people, name);
      await checkPasswordFree(people, password);
      people[slug(name, people)] = { name, ...(await hashPassword(password)), v: 1 };
      message = `${name} added. Tell them their password.`;
    } else if (input.action === 'rename') {
      checkNameFree(people, name, input.id);
      message = `${target.name} is now ${name}.`;
      target.name = name;
    } else if (input.action === 'reset') {
      if (target.admin) throw new UserError(400, 'Your password is set in Netlify, not here.');
      await checkPasswordFree(people, password, input.id);
      Object.assign(target, await hashPassword(password), { v: (target.v || 1) + 1 });
      message = `${target.name}'s password changed. They'll need to log in again.`;
    } else if (input.action === 'pause') {
      if (target.admin) throw new UserError(400, 'You can\'t pause yourself.');
      target.paused = !!input.paused;
      message = `${target.name} is ${target.paused ? 'paused' : 'back on'}.`;
    } else if (input.action === 'remove') {
      if (target.admin) throw new UserError(400, 'You can\'t remove yourself.');
      message = `${target.name} removed.`;
      delete people[input.id];
    } else {
      throw new UserError(400, 'Unknown action.');
    }
    return current;
  });
  if (input.action === 'remove') await store().delete(blocksKey(input.id));

  return json({ people: await listFor(data.people, true), message });
});

export const config = { path: '/api/training/people' };
