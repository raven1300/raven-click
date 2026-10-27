// Training data in Netlify Blobs, kept apart from the recipe store.
//   people          { people: { [id]: { name, admin?, paused?, salt?, hash?, v? } } }
//   exercises       { exercises: { [id]: { name, type, hidden?, picture? } } }
//   pictures/<ex>/full, pictures/<ex>/thumb   JPEGs, see pictures.js
//   blocks/<person> { blocks: [ { num, status, plan, workouts, notes, createdAt, startedAt?, completedAt? } ] }
//   lockouts/<ip>   { fails, until }
//   logs/<person>/<block> logged sets, see logs.js
import { getStore } from '@netlify/blobs';
import { STARTING_EXERCISES } from './exercises.js';

// Deploy previews and local testing use their own store, so testing never touches live data.
// If the deploy context is ever missing, stay on the live store rather than hide real data.
let storeName = 'training';
export function useDeployContext(context) {
  const deploy = context?.deploy?.context;
  storeName = !deploy || deploy === 'production' ? 'training' : 'training-preview';
}
export const isPreviewStore = () => storeName !== 'training';

export const store = () => getStore({ name: storeName, consistency: 'strong' });

export async function read(key, fallback) {
  const data = await store().get(key, { type: 'json' });
  return data ?? fallback();
}

// Read, change and write back, retrying if another request saved in between.
// `change` gets the current data and returns the new data. It may throw to abort.
export async function update(key, fallback, change) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const found = await store().getWithMetadata(key, { type: 'json' });
    const next = await change(found ? found.data : fallback());
    const options = found ? { onlyIfMatch: found.etag } : { onlyIfNew: true };
    const result = await store().setJSON(key, next, options);
    if (result.modified) return next;
  }
  throw new Error('Too many people saving at once. Please try again.');
}

export const loadPeople = async () => (await read('people', () => ({ people: {} }))).people;

export async function loadExercises() {
  const data = await store().get('exercises', { type: 'json' });
  if (data) return data.exercises;
  const seeded = await update('exercises', () => ({ exercises: {} }), current => (
    Object.keys(current.exercises).length ? current : { exercises: { ...STARTING_EXERCISES } }
  ));
  return seeded.exercises;
}

export const blocksKey = personId => `blocks/${personId}`;
export const loadBlocks = async personId => (await read(blocksKey(personId), () => ({ blocks: [] }))).blocks;

// Today's date in Melbourne, as YYYY-MM-DD.
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(new Date());

export function slug(name, taken) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
  let id = base;
  for (let n = 2; taken[id]; n++) id = `${base}-${n}`;
  return id;
}
