// Exercise pictures. GET ?ex&size=thumb|full serves one to anyone logged in. POST (admin) uploads
// or removes one. The browser does the resizing and the square crop, so the server only checks
// and stores two files: `pictures/<ex>/full` (the whole picture) and `pictures/<ex>/thumb` (the crop).
// A still is a shrunk JPEG; an animation (animated GIF or WebP, or an MP4 or WebM clip) is kept as
// uploaded, with a still JPEG thumbnail from its first frame.
// The exercise's `picture` number changes on each upload, so cached copies are never stale.
import { adminUser, body, currentUser, fail, handle, json, UserError } from '../lib/training/http.js';
import { loadExercises, store, update } from '../lib/training/store.js';
import { STARTING_EXERCISES } from '../lib/training/exercises.js';
import { deletePicture } from '../lib/training/pictures.js';
import { HEVC_MESSAGE, MAX_ANIMATION, animationType, isHevc, isJpeg, isVideo } from '../lib/training/animated.js';

const NOT_A_PICTURE = 'That file isn\'t a picture that can be used. Try a JPEG, PNG, GIF, WebP, MP4 or WebM.';
const TYPES = ['image/gif', 'image/webp', 'video/mp4', 'video/webm'];

// The bytes of a data URL. What the browser says the type is doesn't matter; the bytes are checked.
function bytesOf(dataUrl) {
  const match = /^data:[a-z0-9/+.-]*;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw new UserError(400, NOT_A_PICTURE);
  return Buffer.from(match[1], 'base64');
}

function checkFull(dataUrl) {
  const bytes = bytesOf(dataUrl);
  if (isJpeg(bytes)) {
    if (bytes.length > 1_500_000) throw new UserError(400, 'That picture is too big.');
    return { bytes, type: 'image/jpeg', animated: false };
  }
  const type = animationType(bytes);
  if (!type) throw new UserError(400, NOT_A_PICTURE);
  if (bytes.length > MAX_ANIMATION) throw new UserError(400, 'Animations can be up to 4 MB. Make it smaller and try again.');
  if (isVideo(type) && isHevc(bytes)) throw new UserError(400, HEVC_MESSAGE);
  return { bytes, type, animated: true, video: isVideo(type) };
}

function checkThumb(dataUrl) {
  const bytes = bytesOf(dataUrl);
  if (!isJpeg(bytes) || bytes.length > 300_000) throw new UserError(400, NOT_A_PICTURE);
  return bytes;
}

const setPicture = (id, picture) => update('exercises', () => ({ exercises: { ...STARTING_EXERCISES } }), current => {
  const x = current.exercises[id];
  if (!x) throw new UserError(404, 'That exercise is no longer on the list.');
  delete x.picture;
  delete x.animated;
  delete x.video;
  if (picture) Object.assign(x, { picture: picture.version }, picture.animated ? { animated: true } : {}, picture.video ? { video: true } : {});
  return current;
});

export default async (req, context) => handle(async () => {
  if (req.method === 'GET') {
    const user = await currentUser(req);
    if (user instanceof Response) return user;
    const url = new URL(req.url);
    const size = url.searchParams.get('size') === 'full' ? 'full' : 'thumb';
    const found = await store().getWithMetadata(`pictures/${url.searchParams.get('ex')}/${size}`, { type: 'arrayBuffer' });
    if (!found) return fail(404, 'No picture.');
    const type = TYPES.includes(found.metadata?.type) ? found.metadata.type : 'image/jpeg';
    // The URL carries the picture's version, so the browser can keep it. nosniff means the
    // browser only ever treats the file as the type given here.
    const headers = { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=31536000, immutable', 'Accept-Ranges': 'bytes' };
    // Safari only plays a video if it can ask for parts of it.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
    const total = found.data.byteLength;
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
      if (start > end || start >= total) return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${total}` } });
      return new Response(found.data.slice(start, end + 1), { status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${total}` } });
    }
    return new Response(found.data, { headers });
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
  const full = checkFull(input.full), thumb = checkThumb(input.thumb);
  await store().set(`pictures/${input.ex}/full`, full.bytes, { metadata: { type: full.type } });
  await store().set(`pictures/${input.ex}/thumb`, thumb, { metadata: { type: 'image/jpeg' } });
  const data = await setPicture(input.ex, { version: Date.now(), animated: full.animated, video: full.video });
  const what = full.video ? 'video' : full.animated ? 'animation' : 'picture';
  return json({ exercises: data.exercises, message: x.picture ? `${x.name}'s picture replaced with ${full.video ? 'a video' : full.animated ? 'an animation' : 'a still'}.` : `${what[0].toUpperCase()}${what.slice(1)} added to ${x.name}.` });
}, context);

export const config = { path: '/api/training/picture' };
