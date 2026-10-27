import { useEffect, useState } from 'preact/hooks';
import { ChevronDown, ChevronUp, Minus, Plus, X } from 'lucide-preact';
import { api, setFlash } from './api.js';
import Shell from './Shell.jsx';
import { ICONS, Icon, Sheet, TYPE_LABEL, similarNames, totalWeeks } from './ui.jsx';

const STANDARD_PLAN = [{ weeks: 4, reps: 10 }, { weeks: 4, reps: 8 }, { weeks: 4, reps: 6 }];
const newId = () => (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
const blankWorkout = () => ({ id: newId(), name: '', icon: 'dumbbell', items: [] });
const copyOf = block => ({ plan: block.plan.map(ph => ({ ...ph })), workouts: block.workouts.map(w => ({ ...w, items: w.items.map(it => ({ ...it })) })) });
const numberOrBlank = value => (value === '' ? NaN : Number(value));

function ExercisePicker({ exercises, taken, onPick, onAdded, onClose }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('weight');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const q = query.trim().toLowerCase();
  const list = Object.entries(exercises).filter(([, x]) => !q || x.name.toLowerCase().includes(q)).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const exact = Object.values(exercises).some(x => x.name.toLowerCase() === q);
  const similar = similarNames(query, exercises);
  // Adds a brand-new exercise to the list and straight into this workout.
  const addNew = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await api('exercises', { method: 'POST', body: { name: query.trim(), type } });
      onAdded(data.exercises, data.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Sheet title="Add an exercise" onClose={onClose}>
      <p class="small muted" style={{ margin: 0 }}>Adds it to this workout with 2 sets. Not on the list? Type its name to add it.</p>
      <input id="pick-search" class="input" type="search" placeholder="Search the exercise list" value={query} onInput={e => setQuery(e.currentTarget.value)} aria-label="Search the exercise list" />
      <div class="list">
        {list.map(([id, x]) => (
          <button class="list-btn" key={id} disabled={taken.includes(id)} onClick={() => onPick(id)}>
            <span>{x.name}<span class="sub">{TYPE_LABEL[x.type]}{taken.includes(id) ? ' · already in this workout' : ''}</span></span><span class="chev">+</span>
          </button>
        ))}
        {!list.length && <p class="muted" style={{ margin: 0 }}>No exercises match.</p>}
      </div>
      {exact ? null : query.trim() && (
        <div class="panel">
          <b>Add &quot;{query.trim()}&quot; as a new exercise</b>
          {similar.length > 0 && <p class="small" style={{ margin: 0, color: 'var(--accent)' }}>Did you mean {similar.slice(0, 3).join(' or ')}? If it's the same exercise, pick that one above so its history stays together.</p>}
          <div class="row">
            <select id="new-ex-type" class="select" value={type} onChange={e => setType(e.currentTarget.value)} aria-label="Exercise type">
              {Object.entries(TYPE_LABEL).map(([t, label]) => <option key={t} value={t}>{label}</option>)}
            </select>
            <button class="btn primary" disabled={busy} onClick={addNew}>Add exercise</button>
          </div>
          {error && <p class="error-box" role="alert">{error}</p>}
        </div>
      )}
    </Sheet>
  );
}

function IconPicker({ current, onPick, onClose }) {
  return (
    <Sheet title="Choose an icon" onClose={onClose}>
      <div class="icon-grid">
        {Object.keys(ICONS).map(name => (
          <button key={name} class={`icon-btn${name === current ? ' on' : ''}`} aria-label={name} onClick={() => onPick(name)}><Icon name={name} /></button>
        ))}
      </div>
    </Sheet>
  );
}

function BuilderBody({ me }) {
  const params = new URLSearchParams(window.location.search);
  const editPerson = params.get('person');
  const editNum = Number(params.get('block'));
  const editing = !!editPerson;
  const [editStatus, setEditStatus] = useState('queued');
  // Workouts with training logged in the running block being edited. Any at all locks the phase plan.
  const [trainedWorkouts, setTrainedWorkouts] = useState(null);
  const locked = !!trainedWorkouts?.size;

  const [exercises, setExercises] = useState(null);
  const [people, setPeople] = useState([]);
  const [allBlocks, setAllBlocks] = useState({});
  const [source, setSource] = useState('blank');
  const [plan, setPlan] = useState(STANDARD_PLAN.map(ph => ({ ...ph })));
  const [workouts, setWorkouts] = useState([blankWorkout()]);
  const [assign, setAssign] = useState({});
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = block => { const c = copyOf(block); setPlan(c.plan); setWorkouts(c.workouts); };

  useEffect(() => {
    Promise.all([api('exercises'), api('people'), api('blocks?all=1')]).then(([ex, p, b]) => {
      setExercises(ex.exercises);
      setPeople(p.people);
      setAllBlocks(b.blocks);
      if (editing) {
        const block = (b.blocks[editPerson] || []).find(x => x.num === editNum && x.status !== 'completed');
        if (!block) { setLoadError('That block can no longer be edited. It may have been completed or deleted.'); return; }
        setEditStatus(block.status);
        load(block);
        if (block.status === 'running' && b.trained[editPerson]) {
          api(`blocks?person=${encodeURIComponent(editPerson)}`)
            .then(d => setTrainedWorkouts(new Set(Object.keys(d.progress || {}).map(k => k.split('/')[1]))))
            .catch(err => setLoadError(err.message));
        }
      } else {
        const mine = (b.blocks[me.id] || []).find(x => x.status === 'running');
        if (mine) { setSource(`${me.id}:${mine.num}`); load(mine); }
      }
    }).catch(err => setLoadError(err.message));
  }, []);

  if (loadError) return <p class="error-box">{loadError}</p>;
  if (!exercises) return <p class="muted">Loading…</p>;

  const nameOf = id => people.find(p => p.id === id)?.name || id;
  const sources = people.flatMap(p => (allBlocks[p.id] || []).slice().sort((a, b) => b.num - a.num).map(b => ({
    value: `${p.id}:${b.num}`,
    label: `${p.name} · Block ${b.num}${b.status === 'queued' ? ' (queued)' : b.status === 'running' ? ' (running)' : ''}`,
  })));

  const pickSource = value => {
    setSource(value);
    if (value === 'blank') { setPlan(STANDARD_PLAN.map(ph => ({ ...ph }))); setWorkouts([blankWorkout()]); return; }
    const [pid, num] = value.split(':');
    load((allBlocks[pid] || []).find(b => b.num === Number(num)));
  };
  const setPhase = (i, field, value) => setPlan(plan.map((ph, k) => (k === i ? { ...ph, [field]: field === 'reps' && value === '' ? null : numberOrBlank(value) } : ph)));
  const changeWorkout = (wi, change) => setWorkouts(workouts.map((w, k) => (k === wi ? change(w) : w)));
  const changeItems = (wi, change) => changeWorkout(wi, w => ({ ...w, items: change([...w.items]) }));

  const picked = Object.keys(assign).filter(id => assign[id]);
  const nextNum = id => Math.max(0, ...(allBlocks[id] || []).map(b => b.num)) + 1;
  // Queueing for two or more people asks first, so a stray tick doesn't create a block.
  const save = async (confirmed = false) => {
    setError('');
    if (!editing && !picked.length) { setError('Choose at least one person to get this block.'); return; }
    if (!editing && picked.length > 1 && !confirmed) { setSheet({ type: 'queue' }); return; }
    setSheet(null);
    setBusy(true);
    try {
      const block = { plan, workouts };
      const data = editing
        ? await api('blocks', { method: 'POST', body: { action: 'edit', person: editPerson, num: editNum, block } })
        : await api('blocks', { method: 'POST', body: { action: 'queue', people: picked, block } });
      setFlash(data.message);
      window.location.href = '/training/admin/people/';
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div class="stack">
      <div>
        <a class="back" href="/training/admin/people/">‹ People</a>
        <div class="eyebrow">Admin · {editing ? `Edit ${editStatus} block` : 'New block'}</div>
        <h1 class="t-title">{editing ? `${nameOf(editPerson)} · Block ${editNum}` : 'Build a block'}</h1>
      </div>
      {locked && <p class="notice small">Training has been logged in this block. Changes apply to workouts not started yet. Workouts already trained keep the exercises and sets they were logged with.</p>}

      {!editing && (
        <label class="label" for="source"><span class="meta">Start from</span>
          <select id="source" class="select" value={source} onChange={e => pickSource(e.currentTarget.value)}>
            <option value="blank">Blank block</option>
            {sources.map(s => <option key={s.value} value={s.value}>Copy of {s.label}</option>)}
          </select>
        </label>
      )}

      <section class="panel">
        <div class="split"><h2 class="t-h2">Phase plan</h2><b>{totalWeeks(plan)} weeks</b></div>
        {locked && plan.map((ph, i) => (
          <div class="split" key={i}><span>Phase {i + 1}</span><span class="muted">{ph.weeks} weeks · {ph.reps ? `${ph.reps} reps` : 'no target'}</span></div>
        ))}
        {locked && <p class="small muted" style={{ margin: 0 }}>The phase plan is locked because training has been logged in this block.</p>}
        {!locked && plan.map((ph, i) => (
          <div class="phase-row" key={i}>
            <span class="lbl">Phase {i + 1}</span>
            <label class="field"><input id={`weeks-${i}`} type="number" inputmode="numeric" min="1" value={Number.isNaN(ph.weeks) ? '' : ph.weeks} onInput={e => setPhase(i, 'weeks', e.currentTarget.value)} aria-label={`Phase ${i + 1} weeks`} /><span>weeks</span></label>
            <label class="field"><input id={`reps-${i}`} type="number" inputmode="numeric" min="1" placeholder="none" value={ph.reps ?? ''} onInput={e => setPhase(i, 'reps', e.currentTarget.value)} aria-label={`Phase ${i + 1} rep target`} /><span>reps</span></label>
            <button class="square" aria-label={`Remove phase ${i + 1}`} disabled={plan.length < 2} onClick={() => setPlan(plan.filter((_, k) => k !== i))}><X /></button>
          </div>
        ))}
        {!locked && <div class="row">
          <button class="btn ghost" onClick={() => setPlan([...plan, { weeks: 4, reps: plan.length ? plan[plan.length - 1].reps : null }])}>+ Add phase</button>
          <button class="btn ghost" onClick={() => setPlan(STANDARD_PLAN.map(ph => ({ ...ph })))}>Use Standard (3 × 4 weeks · 10, 8, 6)</button>
        </div>}
        {!locked && <p class="small muted" style={{ margin: 0 }}>Leave reps empty for no target. Targets only apply to weight exercises. Sets are set per exercise below.</p>}
      </section>

      <h2 class="t-h2">Workouts</h2>
      {workouts.map((w, wi) => (
        <article class="card" key={w.id}>
          <div class="card-head">
            <button class="icon-btn" aria-label="Choose icon" onClick={() => setSheet({ type: 'icon', wi })}><Icon name={w.icon} /></button>
            <input id={`workout-${wi}`} class="input name-input" placeholder="Workout name, for example Legs" value={w.name} onInput={e => changeWorkout(wi, x => ({ ...x, name: e.currentTarget.value }))} aria-label={`Workout ${wi + 1} name`} />
          </div>
          <div>
            {w.items.map((it, ii) => (
              <div class="b-row" key={it.ex}>
                <div class="b-name">{exercises[it.ex]?.name || 'Removed exercise'} {exercises[it.ex] && exercises[it.ex].type !== 'weight' && <span class="chip">{TYPE_LABEL[exercises[it.ex].type]}</span>}</div>
                <div class="stepper">
                  <button class="square" aria-label="Fewer sets" disabled={it.sets < 2} onClick={() => changeItems(wi, items => { items[ii] = { ...it, sets: it.sets - 1 }; return items; })}><Minus /></button>
                  <b>{it.sets}</b><span>sets</span>
                  <button class="square" aria-label="More sets" disabled={it.sets >= 20} onClick={() => changeItems(wi, items => { items[ii] = { ...it, sets: it.sets + 1 }; return items; })}><Plus /></button>
                </div>
                <div class="b-tools">
                  <button class="square" aria-label="Move up" disabled={ii === 0} onClick={() => changeItems(wi, items => { [items[ii - 1], items[ii]] = [items[ii], items[ii - 1]]; return items; })}><ChevronUp /></button>
                  <button class="square" aria-label="Move down" disabled={ii === w.items.length - 1} onClick={() => changeItems(wi, items => { [items[ii + 1], items[ii]] = [items[ii], items[ii + 1]]; return items; })}><ChevronDown /></button>
                  <button class="square" aria-label={`Remove ${exercises[it.ex]?.name || 'exercise'}`} onClick={() => changeItems(wi, items => items.filter((_, k) => k !== ii))}><X /></button>
                </div>
              </div>
            ))}
            {!w.items.length && <p class="muted small" style={{ margin: 0 }}>No exercises yet.</p>}
          </div>
          <div class="split">
            <button class="btn ghost" onClick={() => setSheet({ type: 'exercise', wi })}>+ Add exercise</button>
            {workouts.length > 1 && (trainedWorkouts?.has(w.id)
              ? <span class="small muted">Has training logged, so it stays</span>
              : <button class="btn ghost danger" onClick={() => setWorkouts(workouts.filter((_, k) => k !== wi))}>Remove workout</button>)}
          </div>
        </article>
      ))}
      <button class="add-dashed" onClick={() => setWorkouts([...workouts, blankWorkout()])}>+ Add workout</button>

      {!editing && (
        <section class="panel">
          <h2 class="t-h2">Who gets this block</h2>
          {people.map(p => {
            const list = allBlocks[p.id] || [];
            const q = list.find(b => b.status === 'queued');
            const next = Math.max(0, ...list.map(b => b.num)) + 1;
            return (
              <label class="check" key={p.id} for={`assign-${p.id}`}>
                <input id={`assign-${p.id}`} type="checkbox" disabled={!!q} checked={!!assign[p.id]} onChange={e => { setAssign({ ...assign, [p.id]: e.currentTarget.checked }); setError(''); }} />
                <span><b>{p.name}</b> <span class="muted small">{q ? `already has Block ${q.num} queued. Edit that from People.` : `gets it as Block ${next}, queued`}</span></span>
              </label>
            );
          })}
          <p class="small muted" style={{ margin: 0 }}>Each person gets their own copy. Changing one later never changes the others.</p>
        </section>
      )}

      {error && <p class="error-box" role="alert">{error}</p>}
      <button class="btn primary big" onClick={() => save()} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save as queued block'}</button>

      {sheet?.type === 'exercise' && (
        <ExercisePicker
          exercises={exercises}
          taken={workouts[sheet.wi].items.map(it => it.ex)}
          onPick={id => { changeItems(sheet.wi, items => [...items, { ex: id, sets: 2 }]); setSheet(null); }}
          onAdded={(list, id) => { setExercises(list); changeItems(sheet.wi, items => [...items, { ex: id, sets: 2 }]); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.type === 'queue' && (
        <Sheet title={`Queue this block for ${picked.length} people?`} onClose={() => setSheet(null)}>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {picked.map(id => <li key={id}><b>{nameOf(id)}</b> gets it as Block {nextNum(id)}</li>)}
          </ul>
          <p class="small muted" style={{ margin: 0 }}>Each gets their own copy, queued until you press Start.</p>
          <div class="row">
            <button class="btn primary" onClick={() => save(true)}>Queue for {picked.length} people</button>
            <button class="btn" onClick={() => setSheet(null)}>Cancel</button>
          </div>
        </Sheet>
      )}
      {sheet?.type === 'icon' && (
        <IconPicker current={workouts[sheet.wi].icon} onPick={name => { changeWorkout(sheet.wi, w => ({ ...w, icon: name })); setSheet(null); }} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}

export default function BlockBuilder() {
  return <Shell adminOnly>{me => <BuilderBody me={me} />}</Shell>;
}
