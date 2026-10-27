import { useEffect, useState } from 'preact/hooks';
import { api } from './api.js';
import Shell from './Shell.jsx';
import { Icon, TYPE_LABEL, fmtSet, longDate, shortDate } from './ui.jsx';

const COLUMNS = { weight: ['Reps', 'Weight'], body: ['Reps'], timed: ['Seconds'], band: ['Reps', 'Band'] };
const cells = (type, s) => (type === 'weight' ? [s.reps, `${s.kg} kg`] : type === 'timed' ? [s.secs] : type === 'band' ? [s.reps, s.band] : [s.reps]);
const CHART_LABEL = { weight: 'Heaviest weight (kg)', body: 'Most reps', timed: 'Longest hold (seconds)', band: 'Most reps' };
const plotValue = (type, s) => (type === 'weight' ? s.kg : type === 'timed' ? s.secs : s.reps);

// Same order as the server's PB rule: weight is heavier then more reps; band counts "No band" first.
const score = (type, s) => (type === 'weight' ? [s.kg, s.reps] : type === 'timed' ? [s.secs] : type === 'band' ? [s.band === 'No band' ? 1 : 0, s.reps] : [s.reps]);
function topSet(type, sets) {
  return sets.reduce((a, b) => {
    const sa = score(type, a), sb = score(type, b);
    const i = sa.findIndex((v, k) => v !== sb[k]);
    return i >= 0 && sb[i] > sa[i] ? b : a;
  });
}

// "Entered by Nick" when one helper logged every set, otherwise "Sets 2 and 3 entered by Nick".
function enteredBy(sets, names) {
  const helped = sets.filter(s => s.by);
  if (!helped.length) return '';
  const who = [...new Set(helped.map(s => s.by))];
  if (who.length === 1 && helped.length === sets.length) return `Entered by ${names[who[0]] || 'someone else'}`;
  const list = nums => (nums.length === 1 ? `Set ${nums[0]}` : `Sets ${nums.slice(0, -1).join(', ')} and ${nums[nums.length - 1]}`);
  return who.map(id => `${list(helped.filter(s => s.by === id).map(s => s.set + 1))} entered by ${names[id] || 'someone else'}`).join(' · ');
}

const where = s => `Block ${s.block} · Week ${s.week} · ${s.workout.name}${s.extra ? ' · extra' : ''}`;

function Results({ data }) {
  const { exercise, sessions, best, names } = data;
  const cols = COLUMNS[exercise.type];
  return sessions.map((s, i) => (
    <section class="session" key={i}>
      <div class="session-head"><b>{longDate(s.date)}</b><span class="small muted">{where(s)}</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Set</th>{cols.map(c => <th key={c}>{c}</th>)}<th><span class="visually-hidden">Personal best</span></th></tr></thead>
          <tbody>
            {s.sets.map(set => {
              const pb = best && best.session === i && best.set.set === set.set;
              return (
                <tr key={set.set} class={pb ? 'pb' : undefined}>
                  <td>{set.set + 1}{set.by && <span class="by-mark" title={`Entered by ${names[set.by] || 'someone else'}`}> •</span>}</td>{cells(exercise.type, set).map((c, k) => <td key={k}>{c}</td>)}<td>{pb ? 'PB' : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {s.note && <div class="note-line">{s.note}</div>}
      {enteredBy(s.sets, names) && <div class="note-line"><span class="by-mark">•</span> {enteredBy(s.sets, names)}</div>}
    </section>
  ));
}

// One point per workout: its best set. A single line, so the title names it and there's no legend.
function Chart({ data }) {
  const { exercise, sessions, best } = data;
  const type = exercise.type;
  const pts = sessions.map((s, i) => ({ s, top: topSet(type, s.sets), pb: best?.session === i })).reverse();
  const [sel, setSel] = useState(pts.length - 1);
  if (pts.length < 2) return <p class="muted">The chart appears after two workouts.</p>;

  const W = 340, H = 200, L = 36, R = 14, T = 20, B = 28;
  // Round-number gridlines (for example 55, 60, 65, 70), about four of them.
  const values = pts.map(p => plotValue(type, p.top));
  const span = Math.max(Math.max(...values) - Math.min(...values), 1);
  const step = [1, 2, 2.5, 5, 10, 20, 25, 50, 100].find(s => span / s <= 3) || 200;
  const lo = Math.max(0, Math.floor(Math.min(...values) / step - 0.5) * step);
  const hi = Math.ceil(Math.max(...values) / step + 0.5) * step;
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, k) => lo + k * step);
  const x = i => L + (i / (pts.length - 1)) * (W - L - R);
  const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(plotValue(type, p.top)).toFixed(1)}`).join(' ');
  const slot = (W - L - R) / (pts.length - 1);
  const cur = pts[sel];

  return (
    <section class="panel">
      <div class="small muted">{CHART_LABEL[type]}, best set of each workout</div>
      <div class="chart-readout" aria-live="polite">
        <b>{fmtSet(type, cur.top)}</b>{cur.pb && <span class="pb"> · PB</span>}
        <span class="small muted"> · {longDate(cur.s.date)} · {where(cur.s)}</span>
      </div>
      <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${CHART_LABEL[type]} over ${pts.length} workouts. The Results tab lists every set.`}>
        {ticks.map(v => (
          <g key={v}>
            <line class="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
            <text x={L - 6} y={y(v) + 4} text-anchor="end">{v}</text>
          </g>
        ))}
        <line class="cursor" x1={x(sel)} x2={x(sel)} y1={T - 6} y2={H - B} />
        <path class="line" d={path} />
        {pts.map((p, i) => (
          <circle key={i} class={p.pb ? 'dot pbdot' : 'dot'} cx={x(i)} cy={y(plotValue(type, p.top))} r={p.pb || i === sel ? 5.5 : 4} />
        ))}
        {pts.map((p, i) => p.pb && (
          <text key={`pb${i}`} class="pbtext" x={Math.min(Math.max(x(i), L + 10), W - R - 10)} y={y(plotValue(type, p.top)) - 10} text-anchor="middle">PB</text>
        ))}
        <text x={L} y={H - 8}>{shortDate(pts[0].s.date)}</text>
        <text x={W - R} y={H - 8} text-anchor="end">{shortDate(pts[pts.length - 1].s.date)}</text>
        {pts.map((p, i) => (
          <rect key={`hit${i}`} class="hit" x={x(i) - slot / 2} y={0} width={slot} height={H - B}
            onPointerEnter={() => setSel(i)} onPointerDown={() => setSel(i)} />
        ))}
      </svg>
    </section>
  );
}

function ExerciseHistoryBody({ me }) {
  const params = new URLSearchParams(window.location.search);
  const personId = params.get('person') || me.id;
  const exId = params.get('ex');
  const back = params.get('back');
  const fromWorkout = !!back && back.startsWith('/training/workout/');
  const backHref = back && back.startsWith('/training/') ? back : `/training/history/${personId === me.id ? '' : `?person=${encodeURIComponent(personId)}`}`;
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('results');
  const [error, setError] = useState('');
  useEffect(() => {
    api(`history?${new URLSearchParams({ person: personId, ex: exId || '' })}`).then(setData).catch(err => setError(err.message));
  }, []);

  const backLink = <a class="back" href={backHref}>‹ {fromWorkout ? 'Back to workout' : 'History'}</a>;
  if (error) return <>{backLink}<p class="error-box">{error}</p></>;
  if (!data) return <>{backLink}<p class="muted">Loading…</p></>;
  const { person, exercise, sessions, best } = data;

  return (
    <div class="stack">
      <div>
        {backLink}
        <div class="eyebrow">{person.name} · {TYPE_LABEL[exercise.type]}</div>
        <h1 class="t-title">{exercise.name}</h1>
        {best && <div class="meta"><Icon name="trophy" /> Personal best: <b class="pb">{fmtSet(exercise.type, best.set)}</b> on {longDate(best.date)}</div>}
      </div>
      {!sessions.length ? <p class="muted">Nothing logged for this exercise yet.</p> : (
        <>
          <div class="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'results' ? 'true' : 'false'} onClick={() => setTab('results')}>Results</button>
            <button role="tab" aria-selected={tab === 'chart' ? 'true' : 'false'} onClick={() => setTab('chart')}>Chart</button>
          </div>
          {tab === 'results' ? <Results data={data} /> : <Chart data={data} />}
        </>
      )}
    </div>
  );
}

export default function ExerciseHistory() {
  return <Shell>{me => <ExerciseHistoryBody me={me} />}</Shell>;
}
