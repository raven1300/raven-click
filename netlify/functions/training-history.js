// A person's history, read-only: every exercise they've logged (GET ?person), or one exercise
// across all their blocks with its personal best (GET ?person&ex).
import { currentUser, fail, handle, json } from '../lib/training/http.js';
import { loadBlocks, loadExercises, store } from '../lib/training/store.js';

// Which set is better, by exercise type. Weight: heavier, then more reps. Band: "No band" beats any band.
const score = (type, s) => {
  if (type === 'weight') return [s.kg ?? 0, s.reps ?? 0];
  if (type === 'timed') return [s.secs ?? 0];
  if (type === 'band') return [s.band === 'No band' ? 1 : 0, s.reps ?? 0];
  return [s.reps ?? 0];
};
const better = (type, a, b) => {
  const sa = score(type, a), sb = score(type, b);
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] > sb[i];
  return false;
};

// Every logged appearance of every exercise, oldest first. Planned sets and extras of the
// same exercise in one workout are separate entries.
async function loadEntries(personId) {
  const blocks = await loadBlocks(personId);
  const { blobs } = await store().list({ prefix: `logs/${personId}/` });
  const entries = [];
  for (const blob of blobs) {
    const num = Number(blob.key.split('/').pop());
    const block = blocks.find(b => b.num === num);
    const data = await store().get(blob.key, { type: 'json' });
    for (const [key, session] of Object.entries(data?.sessions || {})) {
      const [week, workoutId] = key.split('/');
      const workout = block?.workouts.find(w => w.id === workoutId);
      const groups = {};
      for (const s of session.sets) (groups[`${s.ex}|${s.extra ? 'x' : ''}`] ||= []).push(s);
      for (const [gk, sets] of Object.entries(groups)) {
        const extra = gk.endsWith('|x');
        const ex = sets[0].ex;
        entries.push({
          ex,
          date: session.date,
          block: num,
          week: Number(week),
          workout: { id: workoutId, name: workout?.name || workoutId, icon: workout?.icon },
          extra,
          note: session.notes?.[extra ? `${ex}|x` : ex] || '',
          sets: sets.sort((a, b) => a.set - b.set).map(({ ex: _ex, extra: _x, ...rest }) => rest),
        });
      }
    }
  }
  return entries.sort((a, b) => (a.date === b.date ? a.block - b.block || a.week - b.week : a.date < b.date ? -1 : 1));
}

export default async (req, context) => handle(async () => {
  const user = await currentUser(req);
  if (user instanceof Response) return user;
  if (req.method !== 'GET') return fail(405, 'Use GET.');
  const url = new URL(req.url);
  const personId = url.searchParams.get('person') || user.id;
  if (!user.people[personId]) return fail(404, 'That person doesn\'t exist.');
  const person = { id: personId, name: user.people[personId].name };
  const exercises = await loadExercises();
  const entries = await loadEntries(personId);
  const exId = url.searchParams.get('ex');

  if (!exId) {
    const latest = {};
    for (const e of entries) latest[e.ex] = e;
    const list = Object.values(latest)
      .filter(e => exercises[e.ex])
      .map(e => ({ ex: e.ex, name: exercises[e.ex].name, type: exercises[e.ex].type, last: { date: e.date, sets: e.sets } }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return json({ person, exercises: list });
  }

  const exercise = exercises[exId];
  if (!exercise) return fail(404, 'That exercise isn\'t on the list.');
  const mine = entries.filter(e => e.ex === exId);
  // The first time the best set was reached is the PB, so equalling it later doesn't move it.
  let best = null;
  mine.forEach((e, i) => e.sets.forEach(s => { if (!best || better(exercise.type, s, best.set)) best = { entry: i, set: s }; }));
  // Newest first; `best.session` indexes into that order.
  const newest = [...mine].reverse();
  const at = best && mine.length - 1 - best.entry;
  return json({
    person,
    exercise: { id: exId, name: exercise.name, type: exercise.type, picture: exercise.picture, animated: exercise.animated, video: exercise.video },
    sessions: newest,
    // For "Entered by …" on sets someone else logged.
    names: Object.fromEntries(Object.entries(user.people).map(([id, p]) => [id, p.name])),
    best: best && { session: at, set: best.set, date: newest[at].date },
  });
}, context);

export const config = { path: '/api/training/history' };
