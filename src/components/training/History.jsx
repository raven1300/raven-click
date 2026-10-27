import { useEffect, useState } from 'preact/hooks';
import { api } from './api.js';
import Shell from './Shell.jsx';
import { TYPE_LABEL, blockHref, fmtSet, shortDate } from './ui.jsx';

// Every exercise a person has logged, across all their blocks, with search.
function HistoryBody({ me }) {
  const personId = new URLSearchParams(window.location.search).get('person') || me.id;
  const [people, setPeople] = useState([]);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    api(`history?person=${encodeURIComponent(personId)}`).then(setData).catch(err => setError(err.message));
    api('people').then(d => setPeople(d.people)).catch(() => {});
  }, []);

  const back = <a class="back" href={blockHref(me, personId)}>‹ Block</a>;
  if (error) return <>{back}<p class="error-box">{error}</p></>;
  if (!data) return <>{back}<p class="muted">Loading history…</p></>;

  const q = search.trim().toLowerCase();
  const shown = data.exercises.filter(e => !q || e.name.toLowerCase().includes(q));
  const pick = id => { window.location.href = `/training/history/${id === me.id ? '' : `?person=${encodeURIComponent(id)}`}`; };

  return (
    <div class="stack">
      <div>
        {back}
        <div class="eyebrow">Every exercise, every block</div>
        <h1 class="t-title">History</h1>
      </div>
      {people.length > 1 && (
        <label class="row" for="hist-person"><span class="meta">Viewing</span>
          <select id="hist-person" class="select" value={personId} onChange={e => pick(e.currentTarget.value)}>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}{p.id === me.id ? ' (you)' : ''}</option>)}
          </select>
        </label>
      )}
      {data.exercises.length > 0 && (
        <input class="input" type="search" placeholder="Search exercises" aria-label="Search exercises" value={search} onInput={e => setSearch(e.currentTarget.value)} />
      )}
      <section class="panel">
        <div class="list">
          {!data.exercises.length && <p class="muted" style={{ margin: 0 }}>{personId === me.id ? 'Nothing logged yet. Exercises appear here once you tick a set.' : `${data.person.name} hasn't logged anything yet.`}</p>}
          {data.exercises.length > 0 && !shown.length && <p class="muted" style={{ margin: 0 }}>No exercises match.</p>}
          {shown.map(e => (
            <a class="list-btn" key={e.ex} href={`/training/history/exercise/?${new URLSearchParams({ person: personId, ex: e.ex })}`}>
              <span><b>{e.name}</b><span class="sub">{TYPE_LABEL[e.type]} · Last {shortDate(e.last.date)}: {e.last.sets.map(s => fmtSet(e.type, s)).join(', ')}</span></span>
              <span class="chev">›</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function History() {
  return <Shell>{me => <HistoryBody me={me} />}</Shell>;
}
