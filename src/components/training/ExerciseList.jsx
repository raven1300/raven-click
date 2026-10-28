import { useEffect, useState } from 'preact/hooks';
import { api } from './api.js';
import Shell from './Shell.jsx';
import { Picture, Sheet, TYPE_LABEL, pictureUrl, similarNames, useToast } from './ui.jsx';
import { CropStep, PictureButton } from './PictureUpload.jsx';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// "Used in 3 blocks": anyone's blocks, queued, running or finished.
const usageText = u => (u ? `Used in ${plural(u.blocks, 'block')}` : 'Not used yet');

// Rename, hide, merge or delete one exercise. `confirm` is the merge or delete waiting for a yes.
function ExerciseSheet({ id, exercises, usage, onDone, onClose }) {
  const x = exercises[id];
  const u = usage[id];
  const [name, setName] = useState(x.name);
  const others = Object.entries(exercises).filter(([oid, o]) => oid !== id && o.type === x.type).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const [into, setInto] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (body, path = 'exercises') => {
    setBusy(true);
    setError('');
    try {
      onDone(await api(path, { method: 'POST', body: { id, ex: id, ...body } }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (picked) {
    return (
      <Sheet title={`Picture for ${x.name}`} onClose={onClose}>
        <CropStep ex={id} name={x.name} picked={picked} onDone={onDone} onCancel={() => setPicked(null)} />
      </Sheet>
    );
  }

  if (confirm) {
    const target = exercises[into];
    return (
      <Sheet title={confirm === 'merge' ? `Merge into ${target.name}?` : `Delete ${x.name}?`} onClose={onClose}>
        <p style={{ margin: 0 }}>
          {confirm === 'merge'
            ? `All of ${x.name}'s history moves to ${target.name}, blocks using it switch to ${target.name}, and ${x.name} is removed from the list. This can't be undone.`
            : `${x.name} has never been used, so nothing else changes.`}
        </p>
        {error && <p class="error-box" role="alert">{error}</p>}
        <div class="row">
          <button class="btn primary" disabled={busy} onClick={() => send(confirm === 'merge' ? { action: 'merge', into } : { action: 'delete' })}>{confirm === 'merge' ? 'Merge' : 'Delete'}</button>
          <button class="btn" onClick={() => { setConfirm(null); setError(''); }}>Back</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={x.name} onClose={onClose}>
      <p class="small muted" style={{ margin: 0 }}>{TYPE_LABEL[x.type]} · {usageText(u)}{x.hidden ? ' · Hidden' : ''}</p>
      <div class="row">
        {x.picture ? <Picture ex={id} x={x} large /> : <span class="small muted">No picture yet.</span>}
        <PictureButton label={x.picture ? 'Replace picture' : 'Add picture'} disabled={busy} onPicked={setPicked} onError={setError} />
        {x.picture && <button class="btn" disabled={busy} onClick={() => send({ action: 'remove' }, 'picture')}>Remove picture</button>}
      </div>
      <form class="stack" onSubmit={e => { e.preventDefault(); send({ action: 'rename', name }); }}>
        <label class="label" for="ex-name"><span class="meta">Name</span>
          <input id="ex-name" class="input" autocomplete="off" value={name} onInput={e => setName(e.currentTarget.value)} /></label>
        <div class="row"><button class="btn" type="submit" disabled={busy || name.trim() === x.name}>Save name</button><span class="small muted">History stays with it.</span></div>
      </form>

      <div class="stack">
        <label class="label" for="ex-into"><span class="meta">Merge into</span>
          <select id="ex-into" class="select" value={into} onChange={e => setInto(e.currentTarget.value)}>
            <option value="">Choose a {TYPE_LABEL[x.type].toLowerCase()} exercise…</option>
            {others.map(([oid, o]) => <option key={oid} value={oid}>{o.name}{o.hidden ? ' (hidden)' : ''}</option>)}
          </select></label>
        <div class="row"><button class="btn" disabled={busy || !into} onClick={() => setConfirm('merge')}>Merge…</button><span class="small muted">For duplicates. Only the same type can be merged.</span></div>
      </div>

      {error && <p class="error-box" role="alert">{error}</p>}
      <div class="row">
        <button class="btn" disabled={busy} onClick={() => send({ action: x.hidden ? 'unhide' : 'hide' })}>{x.hidden ? 'Unhide' : 'Hide'}</button>
        {!u && <button class="btn danger" disabled={busy} onClick={() => setConfirm('delete')}>Delete…</button>}
        <button class="btn" onClick={onClose}>Close</button>
      </div>
      <p class="small muted" style={{ margin: 0 }}>
        {x.hidden ? 'Hidden exercises stay out of the lists you pick from. Their history stays visible.' : 'Hide an exercise you no longer use: it leaves the lists you pick from, but its history stays.'}
        {u ? ' Used exercises can\'t be deleted.' : ''}
      </p>
    </Sheet>
  );
}

function ExerciseBody() {
  const [exercises, setExercises] = useState(null);
  const [usage, setUsage] = useState({});
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('weight');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const [toast, toastView] = useToast();

  useEffect(() => {
    api('exercises?usage=1').then(d => { setExercises(d.exercises); setUsage(d.usage || {}); }).catch(err => setLoadError(err.message));
  }, []);

  if (loadError) return <p class="error-box">{loadError}</p>;
  if (!exercises) return <p class="muted">Loading exercises…</p>;

  const similar = similarNames(name, exercises);
  const q = query.trim().toLowerCase();
  const list = Object.entries(exercises).filter(([, x]) => !q || x.name.toLowerCase().includes(q)).sort((a, b) => a[1].name.localeCompare(b[1].name));

  const add = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('exercises', { method: 'POST', body: { name, type } });
      setExercises(data.exercises);
      setName('');
      toast(data.message);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const changed = data => {
    setExercises(data.exercises);
    if (data.usage) setUsage(data.usage);
    setOpen(null);
    toast(data.message);
  };

  return (
    <div class="stack">
      <div>
        <a class="back" href="/training/">‹ My block</a>
        <div class="eyebrow">Admin</div>
        <h1 class="t-title">Exercise list</h1>
        <div class="meta">Blocks and extras pick from this list, so each exercise keeps one history. Tap an exercise to rename, hide, merge or delete it.</div>
      </div>

      <form class="panel" onSubmit={add}>
        <h2 class="t-h2">Add an exercise</h2>
        <input id="new-name" class="input" placeholder="Name, for example Goblet Squat" value={name} onInput={e => setName(e.currentTarget.value)} aria-label="New exercise name" />
        {similar.length > 0 && (
          <p class="small" style={{ margin: 0, color: 'var(--accent)' }}>
            Did you mean {similar.slice(0, 3).map((s, i) => <span key={s}>{i ? ' or ' : ''}<b>{s}</b></span>)}? If it's the same exercise, use that one so its history stays together.
          </p>
        )}
        <div class="row">
          <select id="new-type" class="select" value={type} onChange={e => setType(e.currentTarget.value)} aria-label="Exercise type">
            {Object.entries(TYPE_LABEL).map(([t, label]) => <option key={t} value={t}>{label}</option>)}
          </select>
          <button class="btn primary" type="submit" disabled={busy}>Add exercise</button>
        </div>
        {error && <p class="error-box" role="alert">{error}</p>}
      </form>

      <input id="search" class="input" type="search" placeholder={`Search ${Object.keys(exercises).length} exercises`} value={query} onInput={e => setQuery(e.currentTarget.value)} aria-label="Search the exercise list" />
      <section class="panel">
        <div class="list">
          {list.map(([id, x]) => (
            <button class="list-btn" key={id} onClick={() => setOpen(id)}>
              <span class="ex-title">
                {x.picture && <img class="pic-mini" src={pictureUrl(id, x.picture, 'thumb')} alt="" loading="lazy" />}
                <span><b>{x.name}</b><span class="sub">{usageText(usage[id])}</span></span>
              </span>
              <span class="row" style={{ flexWrap: 'nowrap' }}>{x.hidden && <span class="chip">Hidden</span>}<span class="chip">{TYPE_LABEL[x.type]}</span></span>
            </button>
          ))}
          {!list.length && <p class="muted" style={{ margin: 0 }}>No exercises match.</p>}
        </div>
      </section>
      {open && exercises[open] && <ExerciseSheet id={open} exercises={exercises} usage={usage} onDone={changed} onClose={() => setOpen(null)} />}
      {toastView}
    </div>
  );
}

export default function ExerciseList() {
  return <Shell adminOnly>{() => <ExerciseBody />}</Shell>;
}
