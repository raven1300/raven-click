// Checks a block sent from the block builder and returns a clean copy.
import { randomUUID } from 'node:crypto';
import { UserError } from './http.js';

export const ICONS = ['footprints', 'dumbbell', 'grab', 'biceps-flexed', 'heart-pulse', 'flame', 'timer', 'zap', 'activity', 'bike', 'mountain', 'trophy', 'target', 'weight', 'rocket', 'star'];

const wholeNumber = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

export function cleanBlock(input, exercises) {
  const plan = Array.isArray(input?.plan) ? input.plan : [];
  const workouts = Array.isArray(input?.workouts) ? input.workouts : [];
  if (!plan.length || plan.length > 12) throw new UserError(400, 'A block needs between 1 and 12 phases.');
  const cleanPlan = plan.map((ph, i) => {
    if (!wholeNumber(ph.weeks, 1, 52)) throw new UserError(400, `Phase ${i + 1} needs a whole number of weeks.`);
    if (ph.reps != null && !wholeNumber(ph.reps, 1, 100)) throw new UserError(400, `Phase ${i + 1}'s rep target must be a whole number, or empty for no target.`);
    return { weeks: ph.weeks, reps: ph.reps ?? null };
  });
  if (!workouts.length || workouts.length > 10) throw new UserError(400, 'A block needs between 1 and 10 workouts.');
  const cleanWorkouts = workouts.map((w, i) => {
    const name = String(w.name || '').trim().slice(0, 40);
    if (!name) throw new UserError(400, `Give workout ${i + 1} a name.`);
    const items = Array.isArray(w.items) ? w.items : [];
    if (!items.length) throw new UserError(400, `Add at least one exercise to ${name}.`);
    const seen = new Set();
    return {
      id: typeof w.id === 'string' && /^[a-z0-9-]{1,40}$/.test(w.id) ? w.id : randomUUID().slice(0, 8),
      name,
      icon: ICONS.includes(w.icon) ? w.icon : 'dumbbell',
      items: items.map(it => {
        if (!exercises[it.ex]) throw new UserError(400, `${name} has an exercise that's no longer on the list.`);
        if (seen.has(it.ex)) throw new UserError(400, `${name} has ${exercises[it.ex].name} twice.`);
        seen.add(it.ex);
        if (!wholeNumber(it.sets, 1, 20)) throw new UserError(400, `${exercises[it.ex].name} needs between 1 and 20 sets.`);
        return { ex: it.ex, sets: it.sets };
      }),
    };
  });
  return { plan: cleanPlan, workouts: cleanWorkouts };
}

export const runningBlock = blocks => blocks.find(b => b.status === 'running');
export const queuedBlock = blocks => blocks.find(b => b.status === 'queued');
export const nextNumber = blocks => Math.max(0, ...blocks.map(b => b.num)) + 1;

// The most recent completed block, if nothing newer is running.
export function reopenableBlock(blocks) {
  if (runningBlock(blocks)) return null;
  const done = blocks.filter(b => b.status === 'completed');
  return done.length ? done.reduce((a, b) => (b.num > a.num ? b : a)) : null;
}
