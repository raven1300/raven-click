import { adminUser, body, currentUser, fail, handle, json, UserError } from '../lib/training/http.js';
import { blocksKey, loadExercises, loadPeople, read, slug, store, update } from '../lib/training/store.js';
import { STARTING_EXERCISES } from '../lib/training/exercises.js';
import { copyPicture, deletePicture } from '../lib/training/pictures.js';

const TYPES = ['weight', 'body', 'timed', 'band'];
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const changeExercises = change => update('exercises', () => ({ exercises: { ...STARTING_EXERCISES } }), async current => {
  await change(current.exercises);
  return current;
});

function checkName(input, exercises, ignoreId) {
  const name = String(input.name || '').trim().slice(0, 60);
  if (!name) throw new UserError(400, 'Type a name first.');
  const clash = Object.entries(exercises).find(([id, x]) => id !== ignoreId && norm(x.name) === norm(name));
  if (clash) throw new UserError(409, clash[1].hidden ? `${clash[1].name} is already on the list, but hidden. Unhide it instead.` : `${clash[1].name} is already on the list.`);
  return name;
}

// Every person's blocks and logs, for usage counts and merging. Logs are `logs/<person>/<block>`.
async function everything() {
  const people = await loadPeople();
  const blocks = Object.fromEntries(await Promise.all(Object.keys(people).map(async id => [id, (await read(blocksKey(id), () => ({ blocks: [] }))).blocks])));
  const { blobs } = await store().list({ prefix: 'logs/' });
  const logs = await Promise.all(blobs.map(async blob => {
    const [, person, num] = blob.key.split('/');
    return { key: blob.key, person, num: Number(num), sessions: (await store().get(blob.key, { type: 'json' }))?.sessions || {} };
  }));
  return { people, blocks, logs };
}

// Per exercise: logged sets, who logged them, and how many blocks use it (planned or logged).
function usage({ blocks, logs }) {
  const result = {};
  const at = ex => (result[ex] ||= { sets: 0, people: new Set(), blocks: new Set() });
  for (const [person, list] of Object.entries(blocks)) {
    for (const b of list) for (const w of b.workouts) for (const it of w.items) at(it.ex).blocks.add(`${person}/${b.num}`);
  }
  for (const log of logs) {
    for (const session of Object.values(log.sessions)) {
      for (const it of [...session.plan, ...session.extras]) at(it.ex).blocks.add(`${log.person}/${log.num}`);
      for (const s of session.sets) { at(s.ex).sets++; at(s.ex).people.add(log.person); }
    }
  }
  return Object.fromEntries(Object.entries(result).map(([ex, u]) => [ex, { sets: u.sets, people: [...u.people], blocks: u.blocks.size }]));
}

// Two exercises can't be merged where both are planned in one workout, or both are extras in one
// trained workout, because their sets would clash. Returns a description of the first clash.
function findClash(from, to, { people, blocks, logs }) {
  const who = id => people[id]?.name || 'Someone';
  for (const [person, list] of Object.entries(blocks)) {
    for (const b of list) {
      const w = b.workouts.find(w => w.items.some(it => it.ex === from) && w.items.some(it => it.ex === to));
      if (w) return `${who(person)}'s Block ${b.num} ${w.name}`;
    }
  }
  for (const log of logs) {
    for (const [key, session] of Object.entries(log.sessions)) {
      const both = list => list.some(it => it.ex === from) && list.some(it => it.ex === to);
      if (both(session.plan) || both(session.extras)) {
        const [week, workoutId] = key.split('/');
        const w = blocks[log.person]?.find(b => b.num === log.num)?.workouts.find(w => w.id === workoutId);
        return `${who(log.person)}'s Block ${log.num}, Week ${week} ${w?.name || ''}`.trim();
      }
    }
  }
  return null;
}

async function merge(from, to) {
  const all = await everything();
  const clash = findClash(from, to, all);
  const exercises = await loadExercises();
  if (clash) throw new UserError(409, `Both ${exercises[from].name} and ${exercises[to].name} are in ${clash}, so they can't be merged.`);
  const swap = it => { if (it.ex === from) it.ex = to; };
  let moved = 0;
  for (const person of Object.keys(all.blocks)) {
    if (!all.blocks[person].some(b => b.workouts.some(w => w.items.some(it => it.ex === from)))) continue;
    await update(blocksKey(person), () => ({ blocks: [] }), data => {
      for (const b of data.blocks) for (const w of b.workouts) {
        if (w.items.some(it => it.ex === from) && w.items.some(it => it.ex === to)) throw new UserError(409, 'Someone changed a block while merging. Please try again.');
        w.items.forEach(swap);
      }
      return data;
    });
  }
  for (const log of all.logs) {
    const uses = Object.values(log.sessions).some(s => [...s.plan, ...s.extras, ...s.sets].some(it => it.ex === from));
    if (!uses) continue;
    await update(log.key, () => ({ sessions: {} }), data => {
      for (const s of Object.values(data.sessions)) {
        s.plan.forEach(swap);
        s.extras.forEach(swap);
        for (const set of s.sets) if (set.ex === from) { set.ex = to; moved++; }
        for (const suffix of ['', '|x']) {
          if (s.notes[from + suffix] != null) { s.notes[to + suffix] = s.notes[from + suffix]; delete s.notes[from + suffix]; }
        }
      }
      return data;
    });
  }
  return moved;
}

export default async (req, context) => handle(async () => {
  if (req.method === 'GET') {
    const user = await currentUser(req);
    if (user instanceof Response) return user;
    const exercises = await loadExercises();
    // ?usage=1 (admin) adds how much each exercise is used, for tidying the list.
    if (new URL(req.url).searchParams.get('usage') && user.person.admin) return json({ exercises, usage: usage(await everything()) });
    return json({ exercises });
  }
  if (req.method !== 'POST') return fail(405, 'Use GET or POST.');

  const user = await adminUser(req);
  if (user instanceof Response) return user;
  const input = await body(req);
  const action = input.action || 'add';

  if (action === 'add') {
    if (!TYPES.includes(input.type)) return fail(400, 'Choose a type.');
    await loadExercises();
    let id, name;
    const data = await changeExercises(exercises => {
      name = checkName(input, exercises);
      id = slug(name, exercises);
      exercises[id] = { name, type: input.type };
    });
    return json({ exercises: data.exercises, id, message: `${name} added.` });
  }

  const current = await loadExercises();
  const x = current[input.id];
  if (!x) return fail(404, 'That exercise is no longer on the list.');
  let message;

  if (action === 'rename') {
    let name;
    await changeExercises(exercises => { name = checkName(input, exercises, input.id); exercises[input.id].name = name; });
    message = `${x.name} renamed to ${name}.`;
  } else if (action === 'hide' || action === 'unhide') {
    await changeExercises(exercises => { if (action === 'hide') exercises[input.id].hidden = true; else delete exercises[input.id].hidden; });
    message = action === 'hide' ? `${x.name} hidden. Its history stays.` : `${x.name} is back in the lists.`;
  } else if (action === 'delete') {
    // Only for exercises nothing uses, so no history or block is lost.
    if (usage(await everything())[input.id]) return fail(409, `${x.name} is used, so it can't be deleted. Hide it or merge it instead.`);
    await changeExercises(exercises => { delete exercises[input.id]; });
    await deletePicture(input.id);
    message = `${x.name} deleted.`;
  } else if (action === 'merge') {
    const target = current[input.into];
    if (!target || input.into === input.id) return fail(400, 'Choose another exercise to merge into.');
    if (target.type !== x.type) return fail(400, `${x.name} and ${target.name} are different types, so they can't be merged.`);
    const moved = await merge(input.id, input.into);
    // The kept exercise keeps its own picture, or takes this one's if it has none.
    const takePicture = x.picture && !target.picture;
    if (takePicture) await copyPicture(input.id, input.into);
    await changeExercises(exercises => {
      if (takePicture && exercises[input.into]) Object.assign(exercises[input.into], { picture: Date.now() }, x.animated ? { animated: true } : {}, x.video ? { video: true } : {});
      delete exercises[input.id];
    });
    await deletePicture(input.id);
    message = `${x.name} merged into ${target.name}${moved ? ` (${moved} set${moved === 1 ? '' : 's'} moved)` : ''}.`;
  } else {
    return fail(400, 'Unknown action.');
  }
  return json({ exercises: await loadExercises(), usage: usage(await everything()), message });
}, context);

export const config = { path: '/api/training/exercises' };
