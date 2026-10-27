import { useEffect, useRef, useState } from 'preact/hooks';
import { api, logFor } from './api.js';
import Shell from './Shell.jsx';
import { Icon, Sheet, TYPE_LABEL, blockHref, fmtSet, useToast } from './ui.jsx';

const FIELDS = { weight: ['reps', 'kg'], body: ['reps'], timed: ['secs'], band: ['band', 'reps'] };
const UNITS = { reps: 'reps', kg: 'kg', secs: 'sec', band: '' };
const REQUIRED = { weight: ['reps', 'kg'], body: ['reps'], timed: ['secs'], band: ['reps'] };
const MISSING_WORD = { reps: 'reps', kg: 'the weight', secs: 'the time' };
const STATE_CHIP = { none: ['', 'Not started'], progress: ['progress', 'In progress'], done: ['done', 'Done'], incomplete: ['incomplete', 'Finished early'] };

const rowKey = (ex, set, extra) => `${ex}|${set}|${extra ? 'x' : ''}`;
const hasTyped = d => !!d && Object.values(d).some(v => v !== '' && v != null);
const missing = (type, d) => REQUIRED[type].filter(f => !d || d[f] === '' || d[f] == null || Number.isNaN(Number(d[f])));
const toValues = (type, d) => Object.fromEntries(FIELDS[type].map(f => [f, f === 'band' ? (d[f] || '') : Number(d[f])]));
const dayLabel = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }); };
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(new Date());

// Every set row on the screen, in order: planned exercises, then extras.
function rowsInOrder(view) {
  const rows = [];
  view.plan.forEach(it => { for (let set = 0; set < it.sets; set++) rows.push({ ex: it.ex, set, extra: false }); });
  (view.session?.extras || []).forEach(e => { for (let set = 0; set < e.sets; set++) rows.push({ ex: e.ex, set, extra: true }); });
  return rows;
}
const findLogged = (view, { ex, set, extra }) => view.session?.sets.find(s => s.ex === ex && s.set === set && !!s.extra === !!extra);

function ExtraPicker({ exercises, taken, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = Object.entries(exercises).filter(([, x]) => !x.hidden && (!q || x.name.toLowerCase().includes(q))).sort((a, b) => a[1].name.localeCompare(b[1].name));
  return (
    <Sheet title="Add an exercise" onClose={onClose}>
      <p class="small muted" style={{ margin: 0 }}>Added to today only. It won't change the block.</p>
      <input id="extra-search" class="input" type="search" placeholder="Search the exercise list" value={query} onInput={e => setQuery(e.currentTarget.value)} aria-label="Search the exercise list" />
      <div class="list">
        {list.map(([id, x]) => (
          <button class="list-btn" key={id} disabled={taken.includes(id)} onClick={() => onPick(id)}>
            <span>{x.name}<span class="sub">{TYPE_LABEL[x.type]}{taken.includes(id) ? ' · already an extra today' : ''}</span></span><span class="chev">+</span>
          </button>
        ))}
      </div>
      <p class="small muted" style={{ margin: 0 }}>Not on the list? Ask Nick to add it.</p>
    </Sheet>
  );
}

function WorkoutBody({ me }) {
  const params = new URLSearchParams(window.location.search);
  const query = { person: params.get('person') || me.id, block: params.get('block'), week: params.get('week'), workout: params.get('workout') };
  // Logging for someone else only applies to the person chosen with "Log for…".
  if (query.person !== me.id && logFor()?.id === query.person) query.logFor = '1';

  const [view, setView] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [drafts, setDrafts] = useState({});
  // Rows the person unticked: their numbers stay visible, but nothing saves them again unless the person edits or re-ticks.
  const [removed, setRemoved] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState({});
  const [openNotes, setOpenNotes] = useState({});
  const [sheet, setSheet] = useState(null);
  const [toast, toastView] = useToast();
  const focused = useRef(null);
  const latest = useRef({});
  latest.current = { view, drafts, removed };

  useEffect(() => {
    api(`session?${new URLSearchParams(query)}`).then(setView).catch(err => setLoadError(err.message));
  }, []);

  if (loadError) return <><a class="back" href="/training/">‹ My block</a><p class="error-box">{loadError}</p></>;
  if (!view) return <p class="muted">Loading workout…</p>;

  const { exercises, session, canEdit } = view;
  const typeOf = ex => exercises[ex]?.type || 'weight';
  const nameOf = ex => exercises[ex]?.name || 'Removed exercise';

  const post = async (action, payload = {}) => {
    const data = await api('session', { method: 'POST', body: { ...query, action, ...payload } });
    setView(data);
    return data;
  };
  const setRowError = (keys, message) => setErrors(e => ({ ...e, ...Object.fromEntries(keys.map(k => [k, message])) }));
  const clearRows = keys => {
    setDrafts(d => { const next = { ...d }; keys.forEach(k => delete next[k]); return next; });
    setErrors(e => { const next = { ...e }; keys.forEach(k => delete next[k]); return next; });
    setRemoved(r => { const next = { ...r }; keys.forEach(k => delete next[k]); return next; });
  };

  // Saves several rows in one request. Rows must already be complete.
  const saveRows = async rows => {
    const keys = rows.map(r => rowKey(r.ex, r.set, r.extra));
    try {
      await post('save-sets', { sets: rows.map(r => ({ ex: r.ex, set: r.set, extra: r.extra, values: toValues(typeOf(r.ex), latest.current.drafts[rowKey(r.ex, r.set, r.extra)]) })) });
      clearRows(keys);
      return true;
    } catch (err) {
      setRowError(keys, err.status === 0 ? 'Not saved. Check your connection and tap ✓ again.' : err.message);
      return false;
    }
  };

  // Earlier rows with complete typed numbers but no tick.
  const readyBefore = row => {
    const { view: v, drafts: d, removed: gone } = latest.current;
    const order = rowsInOrder(v);
    const at = order.findIndex(r => r.ex === row.ex && r.set === row.set && r.extra === row.extra);
    return order.slice(0, at).filter(r => {
      const draft = d[rowKey(r.ex, r.set, r.extra)];
      return !findLogged(v, r) && !gone[rowKey(r.ex, r.set, r.extra)] && hasTyped(draft) && !missing(typeOf(r.ex), draft).length;
    });
  };

  const tick = async row => {
    const key = rowKey(row.ex, row.set, row.extra);
    const logged = findLogged(view, row);
    setBusy(true);
    if (logged) {
      try {
        await post('unsave-set', row);
        setDrafts(d => ({ ...d, [key]: Object.fromEntries(FIELDS[typeOf(row.ex)].map(f => [f, String(logged[f] ?? '')])) }));
        setRemoved(r => ({ ...r, [key]: true }));
      } catch (err) { setRowError([key], err.message); }
      setBusy(false);
      return;
    }
    const gaps = missing(typeOf(row.ex), drafts[key]);
    if (gaps.length) { setRowError([key], `Enter ${gaps.map(g => MISSING_WORD[g]).join(' and ')} first.`); setBusy(false); return; }
    const earlier = readyBefore(row);
    if (await saveRows([...earlier, row]) && earlier.length) toast(`Also saved: ${earlier.map(r => `${nameOf(r.ex)} set ${r.set + 1}`).join(', ')}`);
    setBusy(false);
  };

  // Moving into a different set's boxes saves the set just left, if its numbers are complete.
  const onFocusRow = async row => {
    const key = rowKey(row.ex, row.set, row.extra);
    const prev = focused.current;
    focused.current = key;
    if (!prev || prev === key) return;
    const [ex, set, x] = prev.split('|');
    const prevRow = { ex, set: Number(set), extra: x === 'x' };
    const { view: v, drafts: d, removed: gone } = latest.current;
    if (!v.canEdit || gone[prev] || findLogged(v, prevRow) || !hasTyped(d[prev]) || missing(typeOf(ex), d[prev]).length) return;
    if (await saveRows([prevRow])) toast(`Saved ${nameOf(ex)} set ${prevRow.set + 1}`);
  };

  const unsavedRows = () => rowsInOrder(view).filter(r => { const k = rowKey(r.ex, r.set, r.extra); return !findLogged(view, r) && !removed[k] && hasTyped(drafts[k]); });

  // Leaving for the block or an exercise's history asks first if there are unsaved numbers.
  const backHref = blockHref(me, view.person.id, view.block);
  // Sets someone else entered can only be changed by them, the owner or the admin (the server checks too).
  const canChange = l => view.person.id === me.id || me.admin || (l.by || view.person.id) === me.id;
  const leave = (to = backHref) => {
    const unsaved = unsavedRows();
    if (!unsaved.length) { window.location.href = to; return; }
    setSheet({ type: 'leave', rows: unsaved, to });
  };
  const historyHref = ex => `/training/history/exercise/?${new URLSearchParams({ person: view.person.id, ex, back: window.location.pathname + window.location.search })}`;

  // Plain render functions, not components, so inputs keep focus while typing.
  const setRow = row => {
    const key = rowKey(row.ex, row.set, row.extra);
    const type = typeOf(row.ex);
    const logged = findLogged(view, row);
    const draft = drafts[key] || {};
    const bands = [...new Set((view.last[row.ex]?.sets || []).map(s => s.band).filter(Boolean))];
    return (
      <div class={`set${logged ? ' logged' : ''}`} key={key}>
        <span class="set-lbl">Set {row.set + 1}</span>
        <div class="fields">
          {FIELDS[type].map(f => (
            <label class={`field${f === 'band' ? ' wide' : ''}`} key={f}>
              <input
                id={`in-${key.replace(/[^a-z0-9]/gi, '-')}-${f}`}
                type={f === 'band' ? 'text' : 'number'}
                inputmode={f === 'kg' ? 'decimal' : f === 'band' ? undefined : 'numeric'}
                list={f === 'band' && bands.length ? `bands-${row.ex}` : undefined}
                placeholder={f === 'band' ? 'band' : '–'}
                value={logged ? String(logged[f] ?? '') : (draft[f] ?? '')}
                disabled={!!logged || !canEdit}
                aria-label={`Set ${row.set + 1} ${f === 'secs' ? 'seconds' : f}`}
                onFocus={() => onFocusRow(row)}
                onInput={e => { const value = e.currentTarget.value; setDrafts(d => ({ ...d, [key]: { ...d[key], [f]: value } })); setRemoved(r => { const n = { ...r }; delete n[key]; return n; }); setErrors(er => { const n = { ...er }; delete n[key]; return n; }); }}
              />
              {UNITS[f] && <span>{UNITS[f]}</span>}
            </label>
          ))}
          {bands.length > 0 && <datalist id={`bands-${row.ex}`}>{bands.map(b => <option key={b} value={b} />)}</datalist>}
        </div>
        <button class="tick" aria-pressed={logged ? 'true' : 'false'} aria-label={`${logged ? 'Untick' : 'Save'} set ${row.set + 1}`} disabled={!canEdit || busy || (logged && !canChange(logged))} onClick={() => tick(row)}>✓</button>
        {errors[key] ? <span class="set-msg err">{errors[key]}</span>
          : !logged && canEdit && removed[key] ? <span class="set-msg removed">Removed. Tap ✓ to save it again.</span>
          : !logged && canEdit && hasTyped(draft) ? <span class="set-msg hint">Not saved. Tap ✓</span> : null}
        {logged?.by && <span class="entered-by">Entered by {view.names[logged.by] || 'someone else'}</span>}
      </div>
    );
  };

  const exerciseCard = (ex, sets, extra) => {
    const type = typeOf(ex);
    const noteKey = extra ? `${ex}|x` : ex;
    const savedNote = session?.notes?.[noteKey] || '';
    const noteText = notes[noteKey] ?? savedNote;
    const earlierToday = extra ? (session?.sets || []).filter(s => s.ex === ex && !s.extra).sort((a, b) => a.set - b.set) : [];
    const last = view.last[ex];
    const lastSetLogged = extra && findLogged(view, { ex, set: sets - 1, extra: true });
    return (
      <article class="card" key={extra ? `x-${ex}` : ex}>
        <div class="ex-head">
          <div>
            <div class="ex-name">{nameOf(ex)}</div>
            {(extra || type !== 'weight') && <div class="row" style={{ marginTop: '0.25rem' }}>{extra && <span class="chip extra">Extra</span>}{type !== 'weight' && <span class="chip">{TYPE_LABEL[type]}</span>}</div>}
          </div>
          <div class="target">{type === 'weight' && !extra && view.phase.reps ? <>{sets} × {view.phase.reps}<small>sets × reps</small></> : <>{sets} set{sets > 1 ? 's' : ''}<small>no target</small></>}</div>
        </div>
        <div class="last">
          {earlierToday.length ? `Earlier in this workout · ${earlierToday.map(s => fmtSet(type, s)).join(', ')}`
            : last ? `Last: ${dayLabel(last.date)} · ${last.sets.map(s => fmtSet(type, s)).join(', ')}`
            : 'First time doing this one. No history yet.'}
        </div>
        <div class="sets">{Array.from({ length: sets }, (_, set) => setRow({ ex, set, extra }))}</div>
        {(openNotes[noteKey] || savedNote) && (
          <textarea
            id={`note-${noteKey.replace(/[^a-z0-9]/gi, '-')}`}
            class="input"
            rows="2"
            placeholder="Note for this exercise"
            value={noteText}
            disabled={!canEdit}
            onInput={e => { const value = e.currentTarget.value; setNotes(n => ({ ...n, [noteKey]: value })); }}
            onBlur={() => { if (noteText.trim() !== savedNote) post('note', { ex, extra, text: noteText }).catch(err => toast(err.message)); }}
          />
        )}
        <div class="split">
          {canEdit ? (
            <div class="row">
              {!openNotes[noteKey] && !savedNote && <button class="btn ghost" onClick={() => setOpenNotes(o => ({ ...o, [noteKey]: true }))}>+ Note</button>}
              {extra && <button class="btn ghost" onClick={() => post('extra-sets', { ex, delta: 1 }).catch(err => toast(err.message))}>+ Set</button>}
              {extra && !lastSetLogged && <button class="btn ghost" onClick={() => post('extra-sets', { ex, delta: -1 }).catch(err => toast(err.message))}>{sets > 1 ? '− Set' : 'Remove'}</button>}
            </div>
          ) : <span />}
          <a class="btn ghost" style={{ textDecoration: 'none' }} href={historyHref(ex)} onClick={e => { e.preventDefault(); leave(historyHref(ex)); }}>History ›</a>
        </div>
      </article>
    );
  };

  const total = view.plan.reduce((sum, it) => sum + it.sets, 0);
  const loggedCount = (session?.sets || []).filter(s => !s.extra).length;
  const [chipClass, chipText] = STATE_CHIP[view.state];

  return (
    <div class="stack workout">
      <div>
        <button class="back" onClick={() => leave()}>‹ Block {view.block.num}</button>
        <div class="eyebrow">Week {view.week} · Phase {view.phase.index + 1} · {view.phase.reps ? `${view.phase.reps} reps` : 'no target'}{view.person.id !== me.id ? ` · ${view.person.name}` : ''}</div>
        <h1 class="t-title with-icon"><Icon name={view.workout.icon} />{view.workout.name}</h1>
        <div class="row">
          <span class={`chip ${chipClass}`}>{chipText}</span>
          <label class="meta" for="trained-on">Trained on</label>
          <input id="trained-on" class="date-in" type="date" value={session?.date || todayIso()} disabled={!canEdit || !session}
            onChange={e => e.currentTarget.value && post('date', { date: e.currentTarget.value }).then(() => toast('Date changed')).catch(err => toast(err.message))} />
        </div>
        {!canEdit && <p class="notice small" style={{ marginTop: '0.6rem' }}>{view.block.status === 'running' ? `This is ${view.person.name}'s workout. You can view it but not change it. To log for them, press "Log for ${view.person.name}" on their block.` : 'This block has finished, so this workout is read-only.'}</p>}
      </div>

      {view.plan.map(it => exerciseCard(it.ex, it.sets, false))}
      {(session?.extras || []).map(e => exerciseCard(e.ex, e.sets, true))}
      {canEdit && <button class="add-dashed" onClick={() => setSheet({ type: 'extra' })}>+ Add exercise</button>}
      {view.canClear && session && <button class="btn ghost danger" style={{ alignSelf: 'center' }} onClick={() => setSheet({ type: 'clear' })}>Clear this workout</button>}

      <div class="finishbar">
        <div class="finishbar-inner">
          <span class="meta"><b style={{ color: 'var(--ink)' }}>{loggedCount} of {total}</b> sets logged</span>
          {!canEdit ? null
            : view.state === 'done' ? <span class="meta" style={{ color: 'var(--done-mark)', fontWeight: 700 }}>✓ All sets logged</span>
            : view.state === 'incomplete' ? <button class="btn" onClick={() => post('unfinish').then(() => toast('Finish undone')).catch(err => toast(err.message))}>Undo finish</button>
            : <button class="btn primary" disabled={!session} onClick={() => setSheet({ type: 'finish' })}>Finish workout</button>}
        </div>
      </div>

      {sheet?.type === 'clear' && session && (() => {
        const parts = [];
        if (session.sets.length) parts.push(`${session.sets.length} set${session.sets.length > 1 ? 's' : ''}`);
        const noteCount = Object.keys(session.notes).length;
        if (noteCount) parts.push(`${noteCount} note${noteCount > 1 ? 's' : ''}`);
        if (session.extras.length) parts.push(`${session.extras.length} extra exercise${session.extras.length > 1 ? 's' : ''}`);
        return (
          <Sheet title={`Clear ${view.workout.name}, week ${view.week}?`} onClose={() => setSheet(null)}>
            <p style={{ margin: 0 }}>This removes {parts.length ? parts.join(', ') : 'everything logged here'}, and the tile goes back to not started. Your block stays the same, so you can log this workout again later.</p>
            <div class="row">
              <button class="btn primary" onClick={() => post('clear').then(() => {
                setDrafts({}); setRemoved({}); setErrors({}); setNotes({}); setOpenNotes({});
                setSheet(null); toast('Workout cleared');
              }).catch(err => toast(err.message))}>Clear workout</button>
              <button class="btn" onClick={() => setSheet(null)}>Cancel</button>
            </div>
          </Sheet>
        );
      })()}
      {sheet?.type === 'finish' && (
        <Sheet title="Finish anyway?" onClose={() => setSheet(null)}>
          <p style={{ margin: 0 }}>{loggedCount} of {total} sets logged. The empty sets stay empty and the tile shows it as finished early. You can still fill them in later.</p>
          <div class="row">
            <button class="btn primary" onClick={() => post('finish').then(() => { setSheet(null); toast('Workout finished'); }).catch(err => toast(err.message))}>Finish workout</button>
            <button class="btn" onClick={() => setSheet(null)}>Keep going</button>
          </div>
        </Sheet>
      )}
      {sheet?.type === 'leave' && (() => {
        const complete = sheet.rows.filter(r => !missing(typeOf(r.ex), drafts[rowKey(r.ex, r.set, r.extra)]).length);
        return (
          <Sheet title="Some numbers aren't saved" onClose={() => setSheet(null)}>
            <p style={{ margin: 0 }}>You typed numbers that haven't been saved:</p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {sheet.rows.map(r => {
                const incomplete = !complete.includes(r);
                return <li key={rowKey(r.ex, r.set, r.extra)}>{nameOf(r.ex)} set {r.set + 1}{incomplete ? " (incomplete, can't be saved)" : ''}</li>;
              })}
            </ul>
            <div class="row">
              {complete.length > 0 && (
                <button class="btn primary" onClick={async () => {
                  if (await saveRows(complete)) window.location.href = sheet.to;
                  else setSheet(null);
                }}>Save {complete.length > 1 ? 'them' : 'it'}, then leave</button>
              )}
              <button class="btn" onClick={() => { window.location.href = sheet.to; }}>Discard {sheet.rows.length > 1 ? 'them' : 'it'} and leave</button>
              <button class="btn ghost" onClick={() => setSheet(null)}>Stay</button>
            </div>
          </Sheet>
        );
      })()}
      {sheet?.type === 'extra' && (
        <ExtraPicker
          exercises={exercises}
          taken={(session?.extras || []).map(e => e.ex)}
          onPick={ex => post('add-extra', { ex }).then(() => { setSheet(null); toast(`${nameOf(ex)} added to today`); }).catch(err => toast(err.message))}
          onClose={() => setSheet(null)}
        />
      )}
      {toastView}
    </div>
  );
}

export default function Workout() {
  return <Shell>{me => <WorkoutBody me={me} />}</Shell>;
}
