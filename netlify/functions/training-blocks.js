import { adminUser, body, currentUser, fail, handle, json, UserError } from '../lib/training/http.js';
import { blocksKey, loadBlocks, loadExercises, loadPeople, today, update } from '../lib/training/store.js';
import { cleanBlock, nextNumber, queuedBlock, reopenableBlock, runningBlock } from '../lib/training/blocks.js';
import { finishInProgress, loadSessions, sessionSummary, undoAutoFinish } from '../lib/training/logs.js';

const changeBlocks = (personId, change) => update(blocksKey(personId), () => ({ blocks: [] }), async data => {
  await change(data.blocks);
  return data;
});

export default async (req, context) => handle(async () => {
  if (req.method === 'GET') {
    // Everyone can see everyone's blocks. ?all=1 returns every person's.
    const user = await currentUser(req);
    if (user instanceof Response) return user;
    const url = new URL(req.url);
    if (url.searchParams.get('all')) {
      const entries = await Promise.all(Object.keys(user.people).map(async id => [id, await loadBlocks(id)]));
      return json({ blocks: Object.fromEntries(entries) });
    }
    const personId = url.searchParams.get('person') || user.id;
    if (!user.people[personId]) return fail(404, 'That person doesn\'t exist.');
    // The running block comes with a summary of each trained workout, for the tile colours.
    const blocks = await loadBlocks(personId);
    const running = runningBlock(blocks);
    const progress = {};
    if (running) {
      for (const [key, session] of Object.entries(await loadSessions(personId, running.num))) progress[key] = sessionSummary(session);
    }
    return json({ person: personId, blocks, progress });
  }
  if (req.method !== 'POST') return fail(405, 'Use GET or POST.');

  const user = await adminUser(req);
  if (user instanceof Response) return user;
  const input = await body(req);
  const people = await loadPeople();
  const name = id => people[id]?.name || 'That person';

  if (input.action === 'queue') {
    const ids = Array.isArray(input.people) ? [...new Set(input.people)] : [];
    if (!ids.length) return fail(400, 'Choose at least one person to get this block.');
    if (ids.some(id => !people[id])) return fail(404, 'One of those people no longer exists.');
    const block = cleanBlock(input.block, await loadExercises());
    const queued = [];
    for (const id of ids) {
      await changeBlocks(id, blocks => {
        if (queuedBlock(blocks)) throw new UserError(409, `${name(id)} already has a queued block. Edit or delete that one first.`);
        const num = nextNumber(blocks);
        blocks.push({ num, status: 'queued', ...structuredClone(block), notes: '', createdAt: today() });
        queued.push(`${name(id)} (Block ${num})`);
      });
    }
    return json({ message: `Queued for ${queued.join(', ')}.` });
  }

  const id = input.person;
  if (!people[id]) return fail(404, 'That person doesn\'t exist.');
  let message = '';
  let completedNum = null, reopenedNum = null;

  await changeBlocks(id, async blocks => {
    const running = runningBlock(blocks);
    const queued = queuedBlock(blocks);
    if (input.action === 'edit') {
      if (!queued || queued.num !== input.num) throw new UserError(409, 'Only a queued block can be edited.');
      Object.assign(queued, cleanBlock(input.block, await loadExercises()));
      message = `${name(id)}'s Block ${queued.num} saved.`;
    } else if (input.action === 'delete') {
      if (!queued || queued.num !== input.num) throw new UserError(409, 'Only a queued block can be deleted.');
      blocks.splice(blocks.indexOf(queued), 1);
      message = `Queued Block ${queued.num} deleted.`;
    } else if (input.action === 'start') {
      if (!queued) throw new UserError(409, `${name(id)} has no queued block to start.`);
      if (running) { Object.assign(running, { status: 'completed', completedAt: today() }); completedNum = running.num; }
      Object.assign(queued, { status: 'running', startedAt: today() });
      message = `${name(id)}'s Block ${queued.num} started.`;
    } else if (input.action === 'complete') {
      if (!running) throw new UserError(409, `${name(id)} has no running block.`);
      Object.assign(running, { status: 'completed', completedAt: today() });
      completedNum = running.num;
      message = `${name(id)}'s Block ${running.num} completed.`;
    } else if (input.action === 'reopen') {
      const block = reopenableBlock(blocks);
      if (!block) throw new UserError(409, 'There\'s no block that can be reopened.');
      block.status = 'running';
      delete block.completedAt;
      reopenedNum = block.num;
      message = `${name(id)}'s Block ${block.num} reopened.`;
    } else {
      throw new UserError(400, 'Unknown action.');
    }
  });
  if (completedNum) await finishInProgress(id, completedNum);
  if (reopenedNum) await undoAutoFinish(id, reopenedNum);
  return json({ message });
}, context);

export const config = { path: '/api/training/blocks' };
