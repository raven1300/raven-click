import { useEffect, useState } from 'preact/hooks';
import { api, logFor, startLogFor } from './api.js';
import Shell from './Shell.jsx';
import { Icon, blockHref, longDate, shortDate } from './ui.jsx';

const STATE_LABEL = { none: 'not started', progress: 'in progress', done: 'done', incomplete: 'finished early' };

function Tile({ personId, block, week, workout, summary }) {
  const state = summary?.state || 'none';
  const label = state === 'done' ? `✓ ${shortDate(summary.date)}`
    : state === 'incomplete' ? `${summary.logged}/${summary.total} · ${shortDate(summary.date)}`
    : state === 'progress' ? `${summary.logged}/${summary.total} sets` : '';
  const href = `/training/workout/?${new URLSearchParams({ person: personId, block: block.num, week, workout: workout.id })}`;
  return (
    <a class={`tile ${state}`} href={href} aria-label={`Week ${week} ${workout.name}: ${STATE_LABEL[state]}`}>
      {state === 'progress' && <span class="fill" style={{ height: `${Math.round((summary.logged / summary.total) * 100)}%` }} />}
      <span class="nm"><Icon name={workout.icon} />{workout.name}</span>
      <span class="st">{label || ' '}</span>
    </a>
  );
}

function BlockGrid({ personId, block, progress }) {
  const n = block.workouts.length;
  let weekNo = 0;
  return (
    <div>
      {block.plan.map((ph, i) => {
        const first = weekNo + 1;
        weekNo += ph.weeks;
        const weeks = Array.from({ length: ph.weeks }, (_, k) => first + k);
        return (
          <section class="phase" key={i}>
            <div class="phase-head">
              <h2 class="t-h2">Phase {i + 1} · {ph.weeks === 1 ? `Week ${first}` : `Weeks ${first}–${weekNo}`}</h2>
              <span class="reps">{ph.reps ? `${ph.reps} reps` : 'No target'}</span>
            </div>
            {weeks.map(week => (
              <div class="week" key={week}>
                <span class="wk">W{week}</span>
                <div class="tiles" style={{ '--n': n }}>
                  {block.workouts.map(wo => <Tile key={wo.id} personId={personId} block={block} week={week} workout={wo} summary={progress[`${week}/${wo.id}`]} />)}
                </div>
              </div>
            ))}
          </section>
        );
      })}
      <div class="legend"><span><i />Not started</span><span><i class="progress" />In progress</span><span><i class="done" />Done</span><span><i class="incomplete" />Finished early</span></div>
    </div>
  );
}

function PastBlocks({ me, personId, blocks, shownNum }) {
  const past = blocks.filter(b => b.status === 'completed').sort((a, b) => b.num - a.num);
  if (!past.length) return <section class="panel"><h2 class="t-h2">Past blocks</h2><p class="muted" style={{ margin: 0 }}>None yet.</p></section>;
  const years = [...new Set(past.map(b => (b.startedAt || b.createdAt).slice(0, 4)))];
  return (
    <section class="panel">
      <h2 class="t-h2">Past blocks</h2>
      {years.map((year, i) => {
        const inYear = past.filter(b => (b.startedAt || b.createdAt).startsWith(year));
        return (
          <details key={year} open={i === 0}>
            <summary><b>{year}</b> <span class="muted small">{inYear.length} block{inYear.length > 1 ? 's' : ''}</span></summary>
            <div class="list">
              {inYear.map(b => (
                <a class="list-btn" key={b.num} href={blockHref(me, personId, b)} aria-current={b.num === shownNum ? 'page' : undefined}>
                  <span><b>Block {b.num}</b><span class="sub">{longDate(b.startedAt)} – {longDate(b.completedAt)}{b.num === shownNum ? ' · showing' : ''}</span></span>
                  <span class="chev">›</span>
                </a>
              ))}
            </div>
          </details>
        );
      })}
    </section>
  );
}

function AdminPanel() {
  const links = [
    ['/training/admin/people/', 'People and blocks', 'Add people, build, start, complete and edit blocks'],
    ['/training/admin/exercises/', 'Exercise list', 'Add exercises everyone picks from'],
  ];
  return (
    <section class="panel">
      <h2 class="t-h2">Admin</h2>
      <div class="list">
        {links.map(([href, title, sub]) => (
          <a class="list-btn" href={href} key={href}><span><b>{title}</b><span class="sub">{sub}</span></span><span class="chev">›</span></a>
        ))}
      </div>
    </section>
  );
}

// Notes on the block as a whole. The person and the admin can edit them, even on past blocks.
function BlockNotes({ me, people, personId, block }) {
  const [notes, setNotes] = useState(block.notes || '');
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canEdit = me.id === personId || me.admin;
  if (!canEdit && !notes) return null;
  const adminName = people.find(p => p.admin)?.name || 'Nick';
  const ownerName = people.find(p => p.id === personId)?.name || '';
  const who = me.id === personId ? (me.admin ? 'Only you can edit these.' : `You and ${adminName} can both edit these.`)
    : me.admin ? `You and ${ownerName} can both edit these.` : '';
  const save = async () => {
    setBusy(true); setError('');
    try {
      const data = await api('blocks', { method: 'POST', body: { action: 'notes', person: personId, num: block.num, notes: draft } });
      setNotes(data.notes); setDraft(null);
    } catch (err) { setError(err.message); }
    setBusy(false);
  };
  return (
    <section class="panel">
      <div class="split">
        <h2 class="t-h2">Block notes</h2>
        {canEdit && draft === null && <button class="btn ghost" onClick={() => setDraft(notes)}>{notes ? 'Edit' : '+ Add notes'}</button>}
      </div>
      {draft === null ? (
        notes ? <p class="block-notes">{notes}</p> : <p class="muted small" style={{ margin: 0 }}>No notes yet. For example "got sick around week 9".</p>
      ) : (
        <>
          <textarea id="block-notes" class="input" rows="4" maxLength={2000} value={draft} onInput={e => setDraft(e.currentTarget.value)} aria-label="Block notes" />
          {error && <p class="error-box">{error}</p>}
          <div class="row">
            <button class="btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save notes'}</button>
            <button class="btn" onClick={() => { setDraft(null); setError(''); }}>Cancel</button>
          </div>
        </>
      )}
      {canEdit && who && <span class="small muted">{who}</span>}
    </section>
  );
}

// Whose data is on screen. Everyone can view everyone; logging stays with your own.
function Viewing({ me, people, personId }) {
  const historyHref = `/training/history/${personId === me.id ? '' : `?person=${encodeURIComponent(personId)}`}`;
  return (
    <div class="split">
      {people.length > 1 ? (
        <label class="row" for="viewing"><span class="meta">Viewing</span>
          <select id="viewing" class="select" value={personId} onChange={e => { window.location.href = blockHref(me, e.currentTarget.value); }}>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}{p.id === me.id ? ' (you)' : ''}</option>)}
          </select>
        </label>
      ) : <span />}
      <a class="btn" style={{ textDecoration: 'none' }} href={historyHref}>History</a>
    </div>
  );
}

function DashboardBody({ me }) {
  const params = new URLSearchParams(window.location.search);
  const personId = params.get('person') || me.id;
  const pastNum = Number(params.get('block')) || null;
  const [people, setPeople] = useState([]);
  const [blocks, setBlocks] = useState(null);
  const [progress, setProgress] = useState({});
  const [error, setError] = useState('');
  useEffect(() => {
    const query = new URLSearchParams({ person: personId, ...(pastNum ? { block: pastNum } : {}) });
    api(`blocks?${query}`).then(d => { setBlocks(d.blocks); setProgress(d.progress || {}); }).catch(err => setError(err.message));
    api('people').then(d => setPeople(d.people)).catch(() => {});
  }, []);

  if (error) return <p class="error-box">{error}</p>;
  if (!blocks) return <p class="muted">Loading…</p>;
  const mine = personId === me.id;
  const helping = logFor();
  const name = people.find(p => p.id === personId)?.name || (mine ? me.name : '');
  const running = blocks.find(b => b.status === 'running');
  const queued = blocks.find(b => b.status === 'queued');
  const past = pastNum ? blocks.find(b => b.num === pastNum && b.status === 'completed') : null;
  const shown = past || (pastNum ? null : running);
  const weeks = shown ? shown.plan.reduce((a, ph) => a + ph.weeks, 0) : 0;
  const doneCount = Object.values(progress).filter(s => s.state === 'done' || s.state === 'incomplete').length;

  return (
    <div class="stack">
      <Viewing me={me} people={people} personId={personId} />
      {pastNum && !past && (
        <p class="error-box">That isn't a past block. <a href={blockHref(me, personId)}>Show the current block</a></p>
      )}
      {shown && (
        <>
          <div>
            {past && <a class="back" href={blockHref(me, personId)}>‹ {running ? `Block ${running.num} (current)` : 'Current block'}</a>}
            <div class="eyebrow">{name}{past ? ' · Past block' : ''}</div>
            <h1 class="t-title">Block {shown.num}</h1>
            <div class="meta">{past ? `${longDate(past.startedAt)} – ${longDate(past.completedAt)} · read-only` : `Started ${longDate(shown.startedAt)}`}</div>
            {!past && queued && <div class="meta">Block {queued.num} is queued next.</div>}
          </div>
          {!mine && !past && (helping?.id === personId
            ? <p class="notice small">You're logging for {name}. Tap a workout to log it.</p>
            : <div class="row"><button class="btn primary" onClick={() => { startLogFor({ id: personId, name }); window.location.reload(); }}>Log for {name}</button></div>)}
          <div class="meta">{doneCount} of {shown.workouts.length * weeks} workouts done</div>
          <BlockGrid personId={personId} block={shown} progress={progress} />
          <BlockNotes key={shown.num} me={me} people={people} personId={personId} block={shown} />
        </>
      )}
      {!shown && !pastNum && (
        <div>
          <div class="eyebrow">{name}</div>
          <h1 class="t-title">No block running</h1>
          <div class="meta">{queued ? `Block ${queued.num} is ready. It starts when Nick presses Start.` : mine ? 'Nick will set up your next block soon.' : `${name} has no block running.`}</div>
        </div>
      )}
      <PastBlocks me={me} personId={personId} blocks={blocks} shownNum={past?.num} />
      {me.admin && mine && <AdminPanel />}
    </div>
  );
}

export default function Dashboard() {
  return <Shell>{me => <DashboardBody me={me} />}</Shell>;
}
