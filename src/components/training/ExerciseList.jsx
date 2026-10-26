import { useEffect, useState } from 'preact/hooks';
import { api } from './api.js';
import Shell from './Shell.jsx';
import { TYPE_LABEL, similarNames, useToast } from './ui.jsx';

function ExerciseBody() {
  const [exercises, setExercises] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('weight');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, toastView] = useToast();

  useEffect(() => { api('exercises').then(d => setExercises(d.exercises)).catch(err => setLoadError(err.message)); }, []);

  if (loadError) return <p class="error-box">{loadError}</p>;
  if (!exercises) return <p class="muted">Loading exercises…</p>;

  const similar = similarNames(name, exercises);
  const q = query.trim().toLowerCase();
  const list = Object.values(exercises).filter(x => !q || x.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));

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

  return (
    <div class="stack">
      <div>
        <a class="back" href="/training/">‹ My block</a>
        <div class="eyebrow">Admin</div>
        <h1 class="t-title">Exercise list</h1>
        <div class="meta">Blocks and extras pick from this list, so each exercise keeps one history.</div>
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
          {list.map(x => <div class="split" key={x.name}><span>{x.name}</span><span class="chip">{TYPE_LABEL[x.type]}</span></div>)}
          {!list.length && <p class="muted" style={{ margin: 0 }}>No exercises match.</p>}
        </div>
      </section>
      {toastView}
    </div>
  );
}

export default function ExerciseList() {
  return <Shell adminOnly>{() => <ExerciseBody />}</Shell>;
}
