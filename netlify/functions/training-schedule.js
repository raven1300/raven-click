// Your own weekly schedule (GET), and placing or removing a workout (POST). Only for people
// the admin has switched the schedule on for, and only ever their own.
import { body, currentUser, fail, handle, json, UserError } from '../lib/training/http.js';
import { loadBlocks, today } from '../lib/training/store.js';
import { runningBlock } from '../lib/training/blocks.js';
import { loadSessions, sessionKey, sessionSummary } from '../lib/training/logs.js';
import { changePlan, loadPlan, planFor } from '../lib/training/schedule.js';

const totalWeeks = plan => plan.reduce((sum, ph) => sum + ph.weeks, 0);
const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d)) && !Number.isNaN(Date.parse(d));

async function view(personId, block) {
  if (!block) return { block: null, today: today() };
  const progress = {};
  for (const [key, session] of Object.entries(await loadSessions(personId, block.num))) progress[key] = sessionSummary(session);
  return {
    block: { num: block.num, workouts: block.workouts.map(({ id, name, icon }) => ({ id, name, icon })), weeks: totalWeeks(block.plan) },
    progress,
    plan: planFor(await loadPlan(personId), block),
    today: today(),
  };
}

export default async (req, context) => handle(async () => {
  const user = await currentUser(req);
  if (user instanceof Response) return user;
  if (!user.person.schedule) return fail(403, 'The schedule isn\'t switched on for you. Ask Nick.');
  const block = runningBlock(await loadBlocks(user.id));
  if (req.method === 'GET') return json(await view(user.id, block));
  if (req.method !== 'POST') return fail(405, 'Use GET or POST.');

  const input = await body(req);
  if (!block) return fail(409, 'You have no block running, so there\'s nothing to schedule.');
  const week = Number(input.week);
  const workout = block.workouts.find(w => w.id === input.workout);
  if (!workout || !Number.isInteger(week) || week < 1 || week > totalWeeks(block.plan)) return fail(404, 'That workout isn\'t in your block.');
  if ((await loadSessions(user.id, block.num))[sessionKey(week, workout.id)]) {
    return fail(409, `${workout.name} week ${week} has training logged, so it stays on the day it was trained.`);
  }
  const key = `${block.num}/${week}/${workout.id}`;
  if (input.action === 'place') {
    if (!validDate(input.date)) return fail(400, 'That isn\'t a valid date.');
    if (input.date < today()) return fail(400, 'Pick today or a later day.');
    await changePlan(user.id, plan => { plan[key] = input.date; });
  } else if (input.action === 'remove') {
    await changePlan(user.id, plan => { delete plan[key]; });
  } else {
    throw new UserError(400, 'Unknown action.');
  }
  return json(await view(user.id, block));
}, context);

export const config = { path: '/api/training/schedule' };
