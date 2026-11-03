// A person's weekly schedule: workouts pinned to days. It's only a plan; logging ignores it.
//   schedule/<person> { plan: { "<block>/<week>/<workoutId>": "YYYY-MM-DD" } }
// Only the running block's entries are shown. A trained workout shows on its trained date instead.
import { read, store, update } from './store.js';

const scheduleKey = personId => `schedule/${personId}`;

export const loadPlan = async personId => (await read(scheduleKey(personId), () => ({ plan: {} }))).plan;

// The running block's entries, keyed like sessions: "<week>/<workoutId>".
export function planFor(plan, block) {
  const ids = new Set(block.workouts.map(w => w.id));
  const out = {};
  for (const [key, date] of Object.entries(plan)) {
    const [num, week, workoutId] = key.split('/');
    if (Number(num) === block.num && ids.has(workoutId)) out[`${week}/${workoutId}`] = date;
  }
  return out;
}

export const changePlan = (personId, change) => update(scheduleKey(personId), () => ({ plan: {} }), async data => {
  await change(data.plan);
  return data;
});

// A deleted block's number gets reused, so its entries go with it.
export const forgetBlock = (personId, num) => changePlan(personId, plan => {
  for (const key of Object.keys(plan)) if (key.startsWith(`${num}/`)) delete plan[key];
});

export const deletePlan = personId => store().delete(scheduleKey(personId));
