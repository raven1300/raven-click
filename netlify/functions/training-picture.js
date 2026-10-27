// Exercise pictures. GET ?ex&size=thumb|full serves one to anyone logged in. POST (admin) uploads
// or removes one. The browser does the resizing and the square crop, so the server only checks
// and stores two JPEGs: `pictures/<ex>/full` (whole picture) and `pictures/<ex>/thumb` (the crop).
// The exercise's `picture` number changes on each upload, so cached copies are never stale.
import { adminUser, body, currentUser, fail, handle, json, UserError } from '../lib/training/http.js';
import { loadExercises, store, update } from '../lib/training/store.js';
import { STARTING_EXERCISES } from '../lib/training/exercises.js';
import { deletePicture } from '../lib/training/pictures.js';

const MAX_BYTES = { full: 1_500_000, thumb: 300_000 };

function jpeg(dataUrl, size) {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw new UserError(400, 'That picture couldn\'t be read. Try a JPEG or PNG.');
  const bytes = Buffer.from(match[1], 'base64');
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new UserError(400, 'That picture couldn\'t be read. Try a JPEG or PNG.');
  if (bytes.length > MAX_BYTES[size]) throw new UserError(400, 'That picture is too big.');
  return bytes;
}

const setPicture = (id, version) => update('exercises', () => ({ exercises: { ...STARTING_EXERCISES } }), current => {
  if (!current.exercises[id]) throw new UserError(404, 'That exercise is no longer on the list.');
  if (version) current.exercises[id].picture = version; else delete current.exercises[id].picture;
  return current;
});

export default async (req, context) => handle(async () => {
  if (req.method === 'GET') {
    const user = await currentUser(req);
    if (user instanceof Response) return user;
    const url = new URL(req.url);
    const size = url.searchParams.get('size') === 'full' ? 'full' : 'thumb';
    const data = await store().get(`pictures/${url.searchParams.get('ex')}/${size}`, { type: 'arrayBuffer' });
    if (!data) return fail(404, 'No picture.');
    // The URL carries the picture's version, so the browser can keep it.
    return new Response(data, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable' } });
  }
  if (req.method !== 'POST') return fail(405, 'Use GET or POST.');

  const user = await adminUser(req);
  if (user instanceof Response) return user;
  const input = await body(req);
  const x = (await loadExercises())[input.ex];
  if (!x) return fail(404, 'That exercise is no longer on the list.');

  if (input.action === 'remove') {
    await setPicture(input.ex, null);
    await deletePicture(input.ex);
    return json({ exercises: await loadExercises(), message: `${x.name}'s picture removed.` });
  }
  if (input.action !== 'set') return fail(400, 'Unknown action.');
  const full = jpeg(input.full, 'full'), thumb = jpeg(input.thumb, 'thumb');
  await store().set(`pictures/${input.ex}/full`, full);
  await store().set(`pictures/${input.ex}/thumb`, thumb);
  const data = await setPicture(input.ex, Date.now());
  return json({ exercises: data.exercises, message: x.picture ? `${x.name}'s picture replaced.` : `Picture added to ${x.name}.` });
}, context);

export const config = { path: '/api/training/picture' };
