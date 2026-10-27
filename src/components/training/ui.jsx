import { useEffect, useRef, useState } from 'preact/hooks';
import {
  Activity, BicepsFlexed, Bike, Dumbbell, Flame, Footprints, Grab, HeartPulse,
  Mountain, Play, Rocket, Star, Target, Timer, Trophy, Weight, Zap,
} from 'lucide-preact';

export const ICONS = {
  footprints: Footprints, dumbbell: Dumbbell, grab: Grab, 'biceps-flexed': BicepsFlexed,
  'heart-pulse': HeartPulse, flame: Flame, timer: Timer, zap: Zap, activity: Activity, bike: Bike,
  mountain: Mountain, trophy: Trophy, target: Target, weight: Weight, rocket: Rocket, star: Star,
};

export function Icon({ name }) {
  const Component = ICONS[name] || Dumbbell;
  return <Component aria-hidden="true" />;
}

export const TYPE_LABEL = { weight: 'Weight', body: 'Bodyweight', timed: 'Timed', band: 'Band' };

// Dates are stored as YYYY-MM-DD.
const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const longDate = s => (s ? parseDay(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export const shortDate = s => parseDay(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

export function fmtSet(type, s) {
  if (type === 'weight') return `${s.reps} × ${s.kg} kg`;
  if (type === 'timed') return `${s.secs} s`;
  if (type === 'band') return `${s.reps} reps · ${s.band}`;
  return `${s.reps} reps`;
}

// The dashboard for a person's block: their running one unless `block` names a past one.
export const blockHref = (me, personId, block) => {
  const q = new URLSearchParams();
  if (personId && personId !== me.id) q.set('person', personId);
  if (block && block.status === 'completed') q.set('block', block.num);
  return `/training/${q.size ? `?${q}` : ''}`;
};

export const totalWeeks = plan => plan.reduce((sum, ph) => sum + (ph.weeks || 0), 0);

export function Sheet({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const first = ref.current?.querySelector('input, select, textarea, button');
    first?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div class="scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <h2 class="t-h2">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState(null);
  const timer = useRef(null);
  const show = text => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3000);
  };
  const view = message ? <div class="toast" role="status">{message}</div> : null;
  return [show, view];
}

// Close matches for the "Did you mean…?" check when adding an exercise.
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}
// Words without a plural "s", so "Back Squats" matches "Barbell Back Squat".
const words = s => s.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1).map(w => (w.length > 3 ? w.replace(/s$/, '') : w));
export function similarNames(name, exercises) {
  const n = norm(name);
  if (n.length < 3) return [];
  const typed = words(name);
  return Object.values(exercises)
    .filter(x => {
      const m = norm(x.name);
      if (m.includes(n) || n.includes(m) || distance(m, n) <= (n.length >= 6 ? 3 : 1)) return true;
      const existing = words(x.name);
      return typed.length > 0 && typed.every(w => existing.some(e => e === w || distance(e, w) <= 1));
    })
    .map(x => x.name);
}

// Exercise pictures: a square thumbnail (cropped when uploaded) and the whole picture.
// `version` changes on every upload, so a replaced picture is never shown from the cache.
export const pictureUrl = (ex, version, size) => `/api/training/picture?${new URLSearchParams({ ex, size, v: version })}`;

function PictureView({ ex, x, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div class="scrim pic-view" role="dialog" aria-modal="true" aria-label={x.name} onClick={onClose}>
      <img src={pictureUrl(ex, x.picture, 'full')} alt={x.name} />
      <button class="btn" onClick={onClose}>Close</button>
    </div>
  );
}

// The thumbnail, if the exercise has a picture. Tapping it shows the whole picture, or plays the
// animation (marked with a play badge).
export function Picture({ ex, x, large }) {
  const [open, setOpen] = useState(false);
  if (!x?.picture) return null;
  return (
    <>
      <button type="button" class={`pic-thumb${large ? ' large' : ''}`} aria-label={x.animated ? `Play the animation of ${x.name}` : `Show the picture of ${x.name}`} onClick={() => setOpen(true)}>
        <img src={pictureUrl(ex, x.picture, 'thumb')} alt="" loading="lazy" />
        {x.animated && <span class="pic-play" aria-hidden="true"><Play /></span>}
      </button>
      {open && <PictureView ex={ex} x={x} onClose={() => setOpen(false)} />}
    </>
  );
}
