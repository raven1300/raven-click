// Choosing a picture for an exercise: the browser shrinks it, you drag a square for the thumbnail,
// and two JPEGs are uploaded. The whole picture is kept for the full-size view. An animation (an
// animated GIF or WebP, or an MP4 or WebM clip) is uploaded as it is instead, with a still JPEG
// thumbnail from its first frame.
import { useRef, useState } from 'preact/hooks';
import { api } from './api.js';
import { HEVC_MESSAGE, MAX_ANIMATION, animationType, isHevc, isVideo } from '../../../netlify/lib/training/animated.js';

const readDataUrl = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('That file couldn\'t be read.'));
  reader.readAsDataURL(file);
});

const FULL_MAX = 1000;
const THUMB = 300;

// Draws onto a white background (for transparent PNGs) and returns a JPEG data URL.
function toJpeg(source, sx, sy, sw, sh, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

// Opens the file as an image. Browsers turn sideways phone photos the right way up here.
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That picture couldn\'t be opened. Try a JPEG or PNG. On an iPhone, choose it from the phone itself.')); };
    img.src = url;
  });
}

// Opens a video at its first frame, for the thumbnail. If this browser can't play it, says so.
function loadVideoFrame(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const fail = () => { clearTimeout(timer); URL.revokeObjectURL(url); reject(new Error('That video can\'t be played in this browser. Try an H.264 MP4.')); };
    const timer = setTimeout(fail, 15000);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.onerror = fail;
    // Seeking a moment in makes every browser draw the first frame.
    video.onloadeddata = () => { video.currentTime = Math.min(0.05, video.duration || 0); };
    video.onseeked = () => {
      clearTimeout(timer);
      if (!video.videoWidth) return fail();
      resolve({ source: video, width: video.videoWidth, height: video.videoHeight });
    };
    video.src = url;
  });
}

// Shrinks the picture so its longest side is at most FULL_MAX, and returns it as a canvas.
function shrink({ source, width, height }) {
  const scale = Math.min(1, FULL_MAX / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// The "Add picture" or "Replace picture" button. The shrunk picture goes to `onPicked`, for the crop step.
export function PictureButton({ label, onPicked, onError, disabled }) {
  const input = useRef(null);
  const pick = async e => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      // SVGs can carry code, so they're never used.
      if (file.type === 'image/svg+xml' || /\.svgz?$/i.test(file.name)) throw new Error('SVG pictures can\'t be used. Try a JPEG, PNG, GIF, WebP, MP4 or WebM.');
      // An animation is uploaded as it is; anything else is shrunk to a JPEG.
      const bytes = new Uint8Array(await file.arrayBuffer());
      const animated = animationType(bytes);
      const video = isVideo(animated);
      if (animated && file.size > MAX_ANIMATION) {
        throw new Error(`That ${video ? 'video' : 'animation'} is ${(file.size / 1024 / 1024).toFixed(1)} MB. Animations and videos can be up to 4 MB, so make it smaller (shorter, or a smaller size) and try again.`);
      }
      if (video && isHevc(bytes)) throw new Error(HEVC_MESSAGE);
      const img = video ? await loadVideoFrame(file) : await loadImage(file);
      const canvas = shrink(img);
      onPicked({
        canvas,
        preview: canvas.toDataURL('image/jpeg', 0.85),
        animation: animated ? await readDataUrl(file) : null,
        video,
        small: Math.min(img.width, img.height) < 300 && `${img.width} × ${img.height}`,
      });
    } catch (err) {
      onError(err.message);
    }
  };
  return (
    <>
      <input ref={input} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden onChange={pick} />
      <button class="btn" type="button" disabled={disabled} onClick={() => input.current.click()}>{label}</button>
    </>
  );
}

// Drag the square to choose the thumbnail; the slider makes it smaller or bigger.
export function CropStep({ ex, name, picked, onDone, onCancel }) {
  const { canvas, preview, animation, video, small } = picked;
  const w = canvas.width, h = canvas.height, most = Math.min(w, h);
  const [crop, setCrop] = useState({ x: (w - most) / 2, y: (h - most) / 2, s: most });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  const drag = useRef(null);

  const clamp = c => ({ s: c.s, x: Math.min(Math.max(0, c.x), w - c.s), y: Math.min(Math.max(0, c.y), h - c.s) });
  const down = e => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, start: crop, scale: w / box.current.getBoundingClientRect().width };
  };
  const move = e => {
    const d = drag.current;
    if (!d) return;
    setCrop(clamp({ s: d.start.s, x: d.start.x + (e.clientX - d.px) * d.scale, y: d.start.y + (e.clientY - d.py) * d.scale }));
  };
  const resize = s => setCrop(c => clamp({ s, x: c.x + (c.s - s) / 2, y: c.y + (c.s - s) / 2 }));

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const thumb = toJpeg(canvas, crop.x, crop.y, crop.s, crop.s, THUMB, THUMB);
      onDone(await api('picture', { method: 'POST', body: { action: 'set', ex, full: animation || preview, thumb } }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div class="stack">
      <p class="small muted" style={{ margin: 0 }}>
        Drag the square over the part to show in the small thumbnail. Tapping the thumbnail always shows the whole {video ? 'video' : animation ? 'animation' : 'picture'}.
        {animation && ` This is ${video ? 'a video' : 'an animation'}: the thumbnail is a still of its first frame, with a play badge, and it plays${video ? ' silently, on a loop,' : ''} when tapped.`}
      </p>
      {small && <p class="notice small" style={{ margin: 0 }}>This picture is small ({small} pixels), so it may look blurry. You can still use it.</p>}
      {/* Tall pictures are kept short enough to fit on screen. */}
      <div class="crop" ref={box} style={{ width: `min(100%, ${Math.round((50 * w) / h)}vh)` }}>
        <img src={preview} alt={`Picture for ${name}`} draggable={false} />
        <div
          class="crop-frame"
          style={{ left: `${(crop.x / w) * 100}%`, top: `${(crop.y / h) * 100}%`, width: `${(crop.s / w) * 100}%`, height: `${(crop.s / h) * 100}%` }}
          onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
        />
      </div>
      <label class="label" for="crop-size"><span class="meta">Square size</span>
        <input id="crop-size" type="range" min={Math.round(most * 0.2)} max={most} value={crop.s} onInput={e => resize(Number(e.currentTarget.value))} /></label>
      {error && <p class="error-box" role="alert">{error}</p>}
      <div class="row">
        <button class="btn primary" disabled={busy} onClick={save}>{busy ? 'Uploading…' : 'Use this picture'}</button>
        <button class="btn" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
