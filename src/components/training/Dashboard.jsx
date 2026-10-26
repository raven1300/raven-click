import { useEffect, useState } from 'preact/hooks';
import { api } from './api.js';
import Shell from './Shell.jsx';
import { Icon, longDate } from './ui.jsx';

function BlockGrid({ block }) {
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
                  {block.workouts.map(wo => (
                    <div class="tile" key={wo.id} aria-label={`Week ${week} ${wo.name}: not started`}>
                      <span class="nm"><Icon name={wo.icon} />{wo.name}</span>
                      <span class="st">&nbsp;</span>
                    </div>
                  ))}
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

function PastBlocks({ blocks }) {
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
                <div key={b.num}><b>Block {b.num}</b><span class="sub muted small" style={{ display: 'block' }}>{longDate(b.startedAt)} – {longDate(b.completedAt)}</span></div>
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
    ['/training/admin/people/', 'People and blocks', 'Add people, start, complete and edit blocks'],
    ['/training/admin/build/', 'Build a block', 'From scratch, or copied from anyone\'s block'],
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

function DashboardBody({ me }) {
  const [blocks, setBlocks] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('blocks').then(d => setBlocks(d.blocks)).catch(err => setError(err.message)); }, []);

  if (error) return <p class="error-box">{error}</p>;
  if (!blocks) return <p class="muted">Loading your block…</p>;
  const running = blocks.find(b => b.status === 'running');
  const queued = blocks.find(b => b.status === 'queued');

  return (
    <div class="stack">
      {running ? (
        <>
          <div>
            <div class="eyebrow">{me.name}</div>
            <h1 class="t-title">Block {running.num}</h1>
            <div class="meta">Started {longDate(running.startedAt)}</div>
            {queued && <div class="meta">Block {queued.num} is queued next.</div>}
          </div>
          <p class="notice small">Logging your sets arrives in the next update. For now, this shows your block.</p>
          <BlockGrid block={running} />
        </>
      ) : (
        <div>
          <div class="eyebrow">{me.name}</div>
          <h1 class="t-title">No block running</h1>
          <div class="meta">{queued ? `Block ${queued.num} is ready. It starts when Nick presses Start.` : 'Nick will set up your next block soon.'}</div>
        </div>
      )}
      <PastBlocks blocks={blocks} />
      {me.admin && <AdminPanel />}
    </div>
  );
}

export default function Dashboard() {
  return <Shell>{me => <DashboardBody me={me} />}</Shell>;
}
