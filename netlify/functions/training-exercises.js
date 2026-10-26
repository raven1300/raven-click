import { adminUser, body, currentUser, fail, handle, json, UserError } from '../lib/training/http.js';
import { loadExercises, slug, update } from '../lib/training/store.js';
import { STARTING_EXERCISES } from '../lib/training/exercises.js';

const TYPES = ['weight', 'body', 'timed', 'band'];
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export default async (req) => handle(async () => {
  if (req.method === 'GET') {
    const user = await currentUser(req);
    if (user instanceof Response) return user;
    return json({ exercises: await loadExercises() });
  }
  if (req.method !== 'POST') return fail(405, 'Use GET or POST.');

  const user = await adminUser(req);
  if (user instanceof Response) return user;
  const input = await body(req);
  const name = String(input.name || '').trim().slice(0, 60);
  if (!name) return fail(400, 'Type a name first.');
  if (!TYPES.includes(input.type)) return fail(400, 'Choose a type.');

  await loadExercises();
  const data = await update('exercises', () => ({ exercises: { ...STARTING_EXERCISES } }), current => {
    if (Object.values(current.exercises).some(x => norm(x.name) === norm(name))) throw new UserError(409, `${name} is already on the list.`);
    current.exercises[slug(name, current.exercises)] = { name, type: input.type };
    return current;
  });
  return json({ exercises: data.exercises, message: `${name} added.` });
});

export const config = { path: '/api/training/exercises' };
