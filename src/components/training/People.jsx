import { useEffect, useState } from 'preact/hooks';
import { api, takeFlash } from './api.js';
import Shell from './Shell.jsx';
import { Sheet, longDate, totalWeeks, useToast } from './ui.jsx';

const running = blocks => blocks.find(b => b.status === 'running');
const queued = blocks => blocks.find(b => b.status === 'queued');
function reopenable(blocks) {
  if (running(blocks)) return null;
  const done = blocks.filter(b => b.status === 'completed');
  return done.length ? done.reduce((a, b) => (b.num > a.num ? b : a)) : null;
}

function PersonSheet({ mode, person, onDone, onClose }) {
  const [name, setName] = useState(mode === 'rename' ? person.name : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const title = mode === 'add' ? 'Add a person' : mode === 'rename' ? `Rename ${person.name}` : `New password for ${person.name}`;
  const save = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = mode === 'add' ? { action: 'add', name, password } : mode === 'rename' ? { action: 'rename', id: person.id, name } : { action: 'reset', id: person.id, password };
      const data = await api('people', { method: 'POST', body });
      onDone(data.message);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Sheet title={title} onClose={onClose}>
      <form class="stack" onSubmit={save}>
        {mode !== 'reset' && (
          <label class="label" for="person-name"><span class="meta">{mode === 'rename' ? 'New name' : 'Name'}</span>
            <input id="person-name" class="input" autocomplete="off" value={name} onInput={e => setName(e.currentTarget.value)} /></label>
        )}
        {mode !== 'rename' && (
          <label class="label" for="person-password"><span class="meta">Password</span>
            <input id="person-password" class="input" autocomplete="off" value={password} onInput={e => setPassword(e.currentTarget.value)} /></label>
        )}
        <p class="small muted" style={{ margin: 0 }}>
          {mode === 'add' && 'They start with no block. Build one for them, then press Start. '}
          {mode === 'reset' && 'Their old password stops working and they\'re logged out everywhere. Tell them the new one. '}
          {mode === 'rename' && 'Their blocks and history stay exactly as they are. '}
          {mode !== 'rename' && 'Passwords must be different for everyone, because the password is how the site knows who\'s logging in.'}
        </p>
        {error && <p class="error-box" role="alert">{error}</p>}
        <div class="row">
          <button class="btn primary" type="submit" disabled={busy}>{mode === 'add' ? 'Add person' : mode === 'rename' ? 'Save name' : 'Save password'}</button>
          <button class="btn" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}

function ConfirmSheet({ title, text, button, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const go = async () => {
    setBusy(true);
    setError('');
    try { await onConfirm(); } catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <Sheet title={title} onClose={onClose}>
      <p style={{ margin: 0 }}>{text}</p>
      {error && <p class="error-box" role="alert">{error}</p>}
      <div class="row"><button class="btn primary" onClick={go} disabled={busy}>{button}</button><button class="btn" onClick={onClose}>Cancel</button></div>
    </Sheet>
  );
}

function PeopleBody() {
  const [people, setPeople] = useState(null);
  const [blocks, setBlocks] = useState({});
  const [trained, setTrained] = useState({});
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(null);
  const [toast, toastView] = useToast();

  const load = async () => {
    try {
      const [p, b] = await Promise.all([api('people'), api('blocks?all=1')]);
      setPeople(p.people);
      setBlocks(b.blocks);
      setTrained(b.trained);
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => {
    load();
    const flash = takeFlash();
    if (flash) toast(flash);
  }, []);

  const done = async message => { setSheet(null); toast(message); await load(); };
  const blockAction = (person, action, num) => api('blocks', { method: 'POST', body: { action, person: person.id, num } }).then(d => done(d.message));

  if (error) return <p class="error-box">{error}</p>;
  if (!people) return <p class="muted">Loading people…</p>;

  const withQueued = people.filter(p => queued(blocks[p.id] || []));
  const confirm = (title, text, button, onConfirm) => setSheet({ type: 'confirm', title, text, button, onConfirm });

  return (
    <div class="stack">
      <div>
        <a class="back" href="/training/">‹ My block</a>
        <div class="eyebrow">Admin</div>
        <h1 class="t-title">People</h1>
        <div class="meta">New blocks wait here, queued, until you start them.</div>
      </div>
      <div class="row">
        <a class="btn primary" href="/training/admin/build/" style={{ textDecoration: 'none' }}>+ Build a block</a>
        <button class="btn" onClick={() => setSheet({ type: 'person', mode: 'add' })}>+ Add person</button>
        {withQueued.length > 1 && (
          <button class="btn" onClick={() => confirm('Start all queued blocks?', 'Anyone with a block still running has it completed first.', 'Start all', async () => {
            for (const p of withQueued) await api('blocks', { method: 'POST', body: { action: 'start', person: p.id } });
            await done(`Started blocks for ${withQueued.map(p => p.name).join(', ')}.`);
          })}>Start all queued ({withQueued.length})</button>
        )}
      </div>

      {people.map(person => {
        const list = blocks[person.id] || [];
        const run = running(list), q = queued(list), ro = reopenable(list);
        return (
          <section class="panel" key={person.id}>
            <div class="split">
              <h2 class="t-h2">{person.name} {person.admin && <span class="chip">Admin</span>} {person.paused && <span class="chip">Paused</span>}</h2>
              <button class="btn ghost" onClick={() => setSheet({ type: 'person', mode: 'rename', person })}>Rename</button>
            </div>

            {run && (
              <div class="split">
                <div><b>Block {run.num}</b> <span class="chip progress">Running</span><div class="small muted">Started {longDate(run.startedAt)}</div></div>
                <div class="row">
                  {!trained[person.id] && <>
                    <button class="btn ghost danger" onClick={() => confirm(`Delete ${person.name}'s running Block ${run.num}?`, `Nothing has been logged in it, so no training is lost. ${q ? `Their queued Block ${q.num} stays queued.` : `The next block you build for ${person.name} will be Block ${run.num} again.`}`, 'Delete block', () => blockAction(person, 'delete', run.num))}>Delete</button>
                    <a class="btn" style={{ textDecoration: 'none' }} href={`/training/admin/build/?person=${encodeURIComponent(person.id)}&block=${run.num}`}>Edit</a>
                  </>}
                  <button class="btn" onClick={() => confirm(`Complete ${person.name}'s Block ${run.num}?`, `It becomes a past block and turns read-only. Workouts still in progress become finished early. ${q ? `You can reopen it until you start Block ${q.num}. Block ${q.num} stays queued until you press Start.` : 'You can reopen it any time until you start a newer block.'}`, 'Complete block', () => blockAction(person, 'complete'))}>Complete</button>
                </div>
              </div>
            )}
            {!run && ro && (
              <div class="split">
                <div><span class="small muted">No block running.</span><div class="small muted">Block {ro.num} completed {longDate(ro.completedAt)}</div></div>
                <button class="btn" onClick={() => confirm(`Reopen ${person.name}'s Block ${ro.num}?`, `It becomes their running block again.${q ? ' Their queued block stays queued.' : ''}`, 'Reopen block', () => blockAction(person, 'reopen'))}>Reopen Block {ro.num}</button>
              </div>
            )}
            {!run && !ro && <div class="small muted">{q ? 'No block running.' : 'No block yet.'}</div>}

            {q && (
              <div class="split">
                <div><b>Block {q.num}</b> <span class="chip">Queued</span><div class="small muted">{q.workouts.map(w => w.name).join(', ')} · {totalWeeks(q.plan)} weeks</div></div>
                <div class="row">
                  <button class="btn ghost danger" onClick={() => confirm(`Delete ${person.name}'s queued Block ${q.num}?`, `It hasn't started, so no training is lost. The next block you queue for ${person.name} will be Block ${q.num} again.`, 'Delete block', () => blockAction(person, 'delete', q.num))}>Delete</button>
                  <a class="btn" style={{ textDecoration: 'none' }} href={`/training/admin/build/?person=${encodeURIComponent(person.id)}&block=${q.num}`}>Edit</a>
                  <button class="btn primary" onClick={() => confirm(`Start ${person.name}'s Block ${q.num}?`, run ? `Block ${run.num} is still running. Starting completes it first, and there's no undo for that.` : 'It starts today.', 'Start', () => blockAction(person, 'start'))}>Start</button>
                </div>
              </div>
            )}

            {person.admin ? (
              <div class="small muted">Your password is set in Netlify, not here.</div>
            ) : (
              <div class="split">
                <button class="btn ghost" onClick={() => setSheet({ type: 'person', mode: 'reset', person })}>Reset password</button>
                <div class="row">
                  {!person.hasHistory && (
                    <button class="btn ghost danger" onClick={() => confirm(`Remove ${person.name}?`, `They have no logged sets, so no training history is lost.${list.length ? ` Their ${list.length === 1 ? 'block is' : `${list.length} blocks are`} deleted too.` : ''} Their password stops working.`, 'Remove', () => api('people', { method: 'POST', body: { action: 'remove', id: person.id } }).then(d => done(d.message)))}>Remove</button>
                  )}
                  <button class="btn ghost" onClick={() => api('people', { method: 'POST', body: { action: 'pause', id: person.id, paused: !person.paused } }).then(d => done(d.message)).catch(err => toast(err.message))}>{person.paused ? 'Unpause' : 'Pause'}</button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {sheet?.type === 'person' && <PersonSheet mode={sheet.mode} person={sheet.person} onDone={done} onClose={() => setSheet(null)} />}
      {sheet?.type === 'confirm' && <ConfirmSheet {...sheet} onClose={() => setSheet(null)} />}
      {toastView}
    </div>
  );
}

export default function People() {
  return <Shell adminOnly>{() => <PeopleBody />}</Shell>;
}
