// CSV backup of logged sets, one row per set: GET ?person (your own, or anyone's for the admin)
// or ?all=1 (admin, everyone). Opens in Google Sheets or Excel.
import { currentUser, fail, handle } from '../lib/training/http.js';
import { loadBlocks, loadExercises, store, today } from '../lib/training/store.js';
import { TYPE_LABEL } from '../lib/training/exercises.js';

const HEADER = ['Date', 'Person', 'Block', 'Week', 'Workout', 'Exercise', 'Type', 'Set', 'Extra', 'Reps', 'Kg', 'Seconds', 'Band', 'Entered by', 'Note'];

// Quotes where needed, and stops typed text starting with = + - @ being run as a spreadsheet formula.
const cell = v => {
  if (v == null) return '';
  let s = String(v);
  if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function personRows(personId, people, exercises) {
  const blocks = await loadBlocks(personId);
  const { blobs } = await store().list({ prefix: `logs/${personId}/` });
  const rows = [];
  for (const blob of blobs) {
    const num = Number(blob.key.split('/').pop());
    const block = blocks.find(b => b.num === num);
    const sessions = (await store().get(blob.key, { type: 'json' }))?.sessions || {};
    for (const [key, session] of Object.entries(sessions)) {
      const [week, workoutId] = key.split('/');
      const workout = block?.workouts.find(w => w.id === workoutId)?.name || workoutId;
      // Planned exercises in their order, then extras.
      const order = [...session.plan.map(it => `${it.ex}|`), ...session.extras.map(it => `${it.ex}|x`)];
      const sets = [...session.sets].sort((a, b) => order.indexOf(`${a.ex}|${a.extra ? 'x' : ''}`) - order.indexOf(`${b.ex}|${b.extra ? 'x' : ''}`) || a.set - b.set);
      for (const s of sets) {
        const x = exercises[s.ex];
        rows.push({
          sort: [session.date, num, Number(week)],
          cells: [session.date, people[personId].name, num, Number(week), workout, x?.name || s.ex, TYPE_LABEL[x?.type] || '', s.set + 1, s.extra ? 'Yes' : '',
            s.reps, s.kg, s.secs, s.band, s.by ? people[s.by]?.name || 'Someone else' : '', session.notes?.[s.extra ? `${s.ex}|x` : s.ex] || ''],
        });
      }
    }
  }
  return rows;
}

const bySort = (a, b) => {
  for (let i = 0; i < a.sort.length; i++) if (a.sort[i] !== b.sort[i]) return a.sort[i] < b.sort[i] ? -1 : 1;
  return 0;
};

export default async (req, context) => handle(async () => {
  const user = await currentUser(req);
  if (user instanceof Response) return user;
  if (req.method !== 'GET') return fail(405, 'Use GET.');
  const url = new URL(req.url);
  const all = !!url.searchParams.get('all');
  const personId = url.searchParams.get('person') || user.id;
  if ((all || personId !== user.id) && !user.person.admin) return fail(403, 'You can only export your own training.');
  if (!all && !user.people[personId]) return fail(404, 'That person doesn\'t exist.');

  const exercises = await loadExercises();
  const ids = all ? Object.keys(user.people).sort((a, b) => user.people[a].name.localeCompare(user.people[b].name)) : [personId];
  const rows = [];
  // Stable sort keeps each person's sets together on the same date, in the order above.
  for (const id of ids) rows.push(...(await personRows(id, user.people, exercises)).sort(bySort));
  if (all) rows.sort(bySort);
  const csv = [HEADER, ...rows.map(r => r.cells)].map(r => r.map(cell).join(',')).join('\r\n');

  const who = all ? 'everyone' : user.people[personId].name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'training';
  // The byte order mark tells Excel the file is UTF-8.
  return new Response(`﻿${csv}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="training-${who}-${today()}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}, context);

export const config = { path: '/api/training/export' };
