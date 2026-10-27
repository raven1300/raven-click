// Choosing a picture for an exercise: the browser shrinks it, you drag a square for the thumbnail,
// and two JPEGs are uploaded. The whole picture is kept for the full-size view.
import { useRef, useState } from 'preact/hooks';
import { api } from './api.js';

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
    img.onload = () => resolve(img);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That picture couldn\'t be opened. Try a JPEG or PNG. On an iPhone, choose it from the phone itself.')); };
    img.src = url;
  });
}

// Shrinks the picture so its longest side is at most FULL_MAX, and returns it as a canvas.
function shrink(img) {
  const scale = Math.min(1, FULL_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
      const canvas = shrink(await loadImage(file));
      onPicked({ canvas, preview: canvas.toDataURL('image/jpeg', 0.85) });
    } catch (err) {
      onError(err.message);
    }
  };
  return (
    <>
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
      <button class="btn" type="button" disabled={disabled} onClick={() => input.current.click()}>{label}</button>
    </>
  );
}

// Drag the square to choose the thumbnail; the slider makes it smaller or bigger.
export function CropStep({ ex, name, picked, onDone, onCancel }) {
  const { canvas, preview } = picked;
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
      onDone(await api('picture', { method: 'POST', body: { action: 'set', ex, full: preview, thumb } }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div class="stack">
      <p class="small muted" style={{ margin: 0 }}>Drag the square over the part to show in the small thumbnail. Tapping the thumbnail always shows the whole picture.</p>
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
