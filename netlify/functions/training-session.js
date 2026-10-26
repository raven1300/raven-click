// One workout in a block: load it (GET) and log sets, notes and extras (POST).
import { body, currentUser, fail, handle, json, UserError } from '../lib/training/http.js';
import { loadBlocks, loadExercises } from '../lib/training/store.js';
import { changeSessions, cleanValues, loadSessions, newSession, sessionKey, sessionState } from '../lib/training/logs.js';

const totalWeeks = plan => plan.reduce((sum, ph) => sum + ph.weeks, 0);
function phaseAt(plan, week) {
  let w = week;
  for (let i = 0; i < plan.length; i++) {
    if (w <= plan[i].weeks) return { index: i, reps: plan[i].reps };
    w -= plan[i].weeks;
  }
  return { index: plan.length - 1, reps: plan[plan.length - 1].reps };
}

async function locate(user, input) {
  const personId = input.person || user.id;
  if (!user.people[personId]) throw new UserError(404, 'That person doesn\'t exist.');
  const num = Number(input.block), week = Number(input.week);
  const blocks = await loadBlocks(personId);
  const block = blocks.find(b => b.num === num && b.status !== 'queued');
  if (!block) throw new UserError(404, 'That block isn\'t available.');
  if (!Number.isInteger(week) || week < 1 || week > totalWeeks(block.plan)) throw new UserError(404, 'That week isn\'t in this block.');
  const workout = block.workouts.find(w => w.id === input.workout);
  if (!workout) throw new UserError(404, 'That workout isn\'t in this block.');
  const canEdit = block.status === 'running' && (user.id === personId || !!user.person.admin);
  return { personId, blocks, block, week, workout, key: sessionKey(week, workout.id), canEdit };
}

const setOrder = (a, b) => (a.extra === b.extra ? a.set - b.set : a.extra ? 1 : -1);

// The most recent earlier workout containing each exercise, searching back through older blocks.
async function lastTimes(personId, blocks, block, key, currentSessions, exIds, beforeDate) {
  const result = {};
  const remaining = new Set(exIds);
  const ordered = blocks.filter(b => b.status !== 'queued' && b.num <= block.num).sort((a, b) => b.num - a.num);
  for (const b of ordered) {
    if (!remaining.size) break;
    const sessions = b.num === block.num ? currentSessions : await loadSessions(personId, b.num);
    const entries = Object.entries(sessions)
      .filter(([k, s]) => !(b.num === block.num && k === key) && s.date <= beforeDate)
      .sort(([ka, a], [kb, b2]) => (a.date === b2.date ? Number(kb.split('/')[0]) - Number(ka.split('/')[0]) : a.date < b2.date ? 1 : -1));
    for (const ex of [...remaining]) {
      const found = entries.find(([, s]) => s.sets.some(st => st.ex === ex));
      if (found) {
        result[ex] = { date: found[1].date, sets: found[1].sets.filter(st => st.ex === ex).sort(setOrder) };
        remaining.delete(ex);
      }
    }
  }
  return result;
}

async function workoutView(user, located, sessions) {
  const { personId, blocks, block, week, workout, key, canEdit } = located;
  const session = sessions[key] || null;
  const plan = session ? session.plan : workout.items.map(it => ({ ex: it.ex, sets: it.sets }));
  const exIds = [...new Set([...plan.map(it => it.ex), ...(session?.extras || []).map(e => e.ex)])];
  const date = session?.date || '9999-12-31';
  return {
    person: { id: personId, name: user.people[personId].name },
    block: { num: block.num, status: block.status },
    week,
    phase: phaseAt(block.plan, week),
    workout: { id: workout.id, name: workout.name, icon: workout.icon },
    plan,
    session,
    state: sessionState(session),
    exercises: await loadExercises(),
    last: await lastTimes(personId, blocks, block, key, sessions, exIds, date),
    canEdit,
  };
}

function findSet(session, ex, set, extra) {
  return session.sets.findIndex(s => s.ex === ex && s.set === set && !!s.extra === !!extra);
}

function checkSetSlot(session, ex, set, extra) {
  const slot = extra ? session.extras.find(e => e.ex === ex) : session.plan.find(it => it.ex === ex);
  if (!slot || !Number.isInteger(set) || set < 0 || set >= slot.sets) throw new UserError(400, 'That set isn\'t part of this workout.');
}

export default async (req, context) => handle(async () => {
  const user = await currentUser(req);
  if (user instanceof Response) return user;

  if (req.method === 'GET') {
    const input = Object.fromEntries(new URL(req.url).searchParams);
    const located = await locate(user, input);
    return json(await workoutView(user, located, await loadSessions(located.personId, located.block.num)));
  }
  if (req.method !== 'POST') return fail(405, 'Use GET or POST.');

  const input = await body(req);
  const located = await locate(user, input);
  if (!located.canEdit) {
    return fail(403, located.block.status !== 'running' ? 'This block has finished, so it can\'t be changed.' : 'You can only log your own training.');
  }
  const exercises = await loadExercises();
  const { key, workout } = located;

  const sessions = (await changeSessions(located.personId, located.block.num, sessions => {
    const session = sessions[key] || (sessions[key] = newSession(workout));

    if (input.action === 'save-sets') {
      const sets = Array.isArray(input.sets) ? input.sets.slice(0, 50) : [];
      if (!sets.length) throw new UserError(400, 'Nothing to save.');
      for (const s of sets) {
        const extra = !!s.extra;
        if (!exercises[s.ex]) throw new UserError(400, 'That exercise is no longer on the list.');
        checkSetSlot(session, s.ex, s.set, extra);
        const entry = { ex: s.ex, set: s.set, extra, ...cleanValues(exercises[s.ex].type, s.values) };
        const at = findSet(session, s.ex, s.set, extra);
        if (at >= 0) session.sets[at] = entry; else session.sets.push(entry);
      }
    } else if (input.action === 'unsave-set') {
      const at = findSet(session, input.ex, input.set, input.extra);
      if (at >= 0) session.sets.splice(at, 1);
    } else if (input.action === 'note') {
      const noteKey = input.extra ? `${input.ex}|x` : input.ex;
      const text = String(input.text || '').trim().slice(0, 500);
      if (text) session.notes[noteKey] = text; else delete session.notes[noteKey];
    } else if (input.action === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date)) || Number.isNaN(Date.parse(input.date))) throw new UserError(400, 'That isn\'t a valid date.');
      session.date = input.date;
    } else if (input.action === 'clear') {
      // Empties the workout; the check below then removes it, so the tile goes back to "not started".
      Object.assign(session, { sets: [], extras: [], notes: {}, finished: false });
      delete session.autoFinished;
    } else if (input.action === 'finish') {
      session.finished = true;
      delete session.autoFinished;
    } else if (input.action === 'unfinish') {
      session.finished = false;
      delete session.autoFinished;
    } else if (input.action === 'add-extra') {
      if (!exercises[input.ex]) throw new UserError(400, 'That exercise isn\'t on the list.');
      if (session.extras.some(e => e.ex === input.ex)) throw new UserError(409, `${exercises[input.ex].name} is already an extra today.`);
      session.extras.push({ ex: input.ex, sets: 1 });
    } else if (input.action === 'extra-sets') {
      const extra = session.extras.find(e => e.ex === input.ex);
      if (!extra) throw new UserError(400, 'That extra isn\'t in this workout.');
      if (input.delta > 0) extra.sets = Math.min(20, extra.sets + 1);
      else {
        if (findSet(session, input.ex, extra.sets - 1, true) >= 0) throw new UserError(409, 'Untick the last set before removing it.');
        extra.sets -= 1;
        if (extra.sets <= 0) {
          session.extras = session.extras.filter(e => e !== extra);
          delete session.notes[`${input.ex}|x`];
        }
      }
    } else {
      throw new UserError(400, 'Unknown action.');
    }

    // A workout with nothing in it goes back to "not started".
    if (!session.sets.length && !session.extras.length && !Object.keys(session.notes).length && !session.finished) delete sessions[key];
  })).sessions;

  return json(await workoutView(user, located, sessions));
}, context);

export const config = { path: '/api/training/session' };
