// Logged training, one record per person per block:
//   logs/<person>/<block> { sessions: { "<week>/<workoutId>": session } }
// A session is one trained workout:
//   { date, plan: [{ ex, sets }], sets: [{ ex, set, extra, reps?, kg?, secs?, band? }],
//     extras: [{ ex, sets }], notes: { "<ex>" or "<ex>|x": text }, finished, autoFinished? }
// `plan` is a snapshot of the workout's exercises and sets when it was first trained, so editing
// a running block later never changes how earlier weeks look.
import { read, store, today, update } from './store.js';
import { UserError } from './http.js';

export const logsKey = (personId, num) => `logs/${personId}/${num}`;
export const sessionKey = (week, workoutId) => `${week}/${workoutId}`;

export const loadSessions = async (personId, num) => (await read(logsKey(personId, num), () => ({ sessions: {} }))).sessions;

export const changeSessions = (personId, num, change) =>
  update(logsKey(personId, num), () => ({ sessions: {} }), async data => {
    await change(data.sessions);
    return data;
  });

export const newSession = workout => ({
  date: today(),
  plan: workout.items.map(it => ({ ex: it.ex, sets: it.sets })),
  sets: [],
  extras: [],
  notes: {},
  finished: false,
});

const plannedTotal = session => session.plan.reduce((sum, it) => sum + it.sets, 0);
const plannedLogged = session => session.sets.filter(s => !s.extra).length;

// not started, in progress, done, or finished early (incomplete)
export function sessionState(session) {
  if (!session) return 'none';
  const total = plannedTotal(session), logged = plannedLogged(session);
  if (session.finished) return logged >= total ? 'done' : 'incomplete';
  if (total > 0 && logged >= total) return 'done';
  return logged > 0 ? 'progress' : 'none';
}

export const sessionSummary = session => ({
  date: session.date,
  logged: plannedLogged(session),
  total: plannedTotal(session),
  state: sessionState(session),
});

// Completing a block marks workouts still in progress as finished early, and remembers which,
// so reopening can undo exactly that.
export async function finishInProgress(personId, num) {
  await changeSessions(personId, num, sessions => {
    for (const session of Object.values(sessions)) {
      if (sessionState(session) === 'progress') Object.assign(session, { finished: true, autoFinished: true });
    }
  });
}
export async function undoAutoFinish(personId, num) {
  await changeSessions(personId, num, sessions => {
    for (const session of Object.values(sessions)) {
      if (session.autoFinished) { session.finished = false; delete session.autoFinished; }
    }
  });
}

const wholeNumber = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

// Checks the numbers for one set against the exercise type and returns just the fields that type uses.
export function cleanValues(type, values = {}) {
  const reps = Number(values.reps);
  if (type === 'timed') {
    const secs = Number(values.secs);
    if (!wholeNumber(secs, 1, 36000)) throw new UserError(400, 'Enter the time in whole seconds.');
    return { secs };
  }
  if (!wholeNumber(reps, 0, 1000)) throw new UserError(400, 'Enter reps as a whole number.');
  if (type === 'weight') {
    const kg = Math.round(Number(values.kg) * 100) / 100;
    if (!Number.isFinite(kg) || kg < 0 || kg > 1000) throw new UserError(400, 'Enter the weight in kg.');
    return { reps, kg };
  }
  if (type === 'band') return { reps, band: String(values.band || '').trim().slice(0, 30) || 'No band' };
  return { reps };
}

// True if the person has at least one logged set anywhere. Removing a person needs this to be false.
export async function countLoggedSets(personId) {
  const { blobs } = await store().list({ prefix: `logs/${personId}/` });
  let count = 0;
  for (const blob of blobs) {
    const data = await store().get(blob.key, { type: 'json' });
    for (const session of Object.values(data?.sessions || {})) count += session.sets.length;
    if (count) break;
  }
  return count;
}

export async function deleteLogs(personId) {
  const { blobs } = await store().list({ prefix: `logs/${personId}/` });
  await Promise.all(blobs.map(blob => store().delete(blob.key)));
}
