import { useEffect, useState } from 'preact/hooks';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-preact';
import { api } from './api.js';
import Shell from './Shell.jsx';
import { Icon, Sheet, useToast } from './ui.jsx';

// Dates are YYYY-MM-DD, worked out in UTC so a day is always a day.
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mondayOf = s => addDays(s, -((parse(s).getUTCDay() + 6) % 7));
const fmt = (s, opts) => parse(s).toLocaleDateString('en-AU', { timeZone: 'UTC', ...opts });
const dayName = s => fmt(s, { weekday: 'short' });
const dayLong = s => fmt(s, { weekday: 'short', day: 'numeric', month: 'short' });

const STATE_TEXT = { none: 'Not started', progress: 'In progress', done: 'Done', incomplete: 'Finished early' };
const keyOf = (week, id) => `${week}/${id}`;

function ScheduleBody() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [weekStart, setWeekStart] = useState(null);
  // The workout being placed by tapping, and the one whose sheet is open. Both are "<week>/<workoutId>".
  const [picking, setPicking] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [dragKey, setDragKey] = useState(null);
  const [over, setOver] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, toastView] = useToast();

  useEffect(() => {
    api('schedule').then(d => { setData(d); setWeekStart(mondayOf(d.today)); }).catch(err => setError(err.message));
  }, []);
  useEffect(() => {
    if (!picking) return undefined;
    const onKey = e => { if (e.key === 'Escape') setPicking(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [picking]);

  const back = <a class="back" href="/training/">‹ My block</a>;
  if (error) return <>{back}<p class="error-box">{error}</p></>;
  if (!data) return <p class="muted">Loading…</p>;
  if (!data.block) return <>{back}<h1 class="t-title">Schedule</h1><p class="muted">You have no block running, so there's nothing to schedule yet.</p></>;

  const { block, progress, plan, today } = data;
  const workout = id => block.workouts.find(w => w.id === id);
  const parts = key => { const [week, id] = key.split('/'); return { week: Number(week), w: workout(id) }; };
  const label = key => { const { week, w } = parts(key); return `${w.name} · Week ${week}`; };
  const trained = key => !!progress[key];
  // A trained workout shows on the day it was trained; otherwise on its planned day.
  const dayOf = key => progress[key]?.date || plan[key] || null;

  // One card per workout: its earliest week that isn't trained and isn't on the schedule.
  const upNext = block.workouts.map(w => {
    for (let week = 1; week <= block.weeks; week++) { const k = keyOf(week, w.id); if (!trained(k) && !plan[k]) return k; }
    return null;
  }).filter(Boolean);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const keysOn = day => {
    const keys = [];
    for (let week = 1; week <= block.weeks; week++) for (const w of block.workouts) { const k = keyOf(week, w.id); if (dayOf(k) === day) keys.push(k); }
    return keys;
  };
  const end = days[6];
  const range = `${fmt(weekStart, { day: 'numeric', ...(weekStart.slice(5, 7) === end.slice(5, 7) ? {} : { month: 'short' }) })} – ${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const send = async (payload, done) => {
    setBusy(true);
    try {
      setData(await api('schedule', { method: 'POST', body: payload }));
      toast(done);
    } catch (err) { toast(err.message); }
    setBusy(false);
  };
  const place = (key, day) => {
    setPicking(null); setDragKey(null); setOver(null);
    if (day < today) { toast('Pick today or a later day.'); return; }
    if (plan[key] === day) return;
    const { week, w } = parts(key);
    send({ action: 'place', week, workout: w.id, date: day }, `${label(key)} on ${dayLong(day)}`);
  };
  const unplan = key => {
    const { week, w } = parts(key);
    setSheet(null);
    send({ action: 'remove', week, workout: w.id }, `${label(key)} is back in Up next`);
  };
  const workoutHref = key => { const { week, w } = parts(key); return `/training/workout/?${new URLSearchParams({ block: block.num, week, workout: w.id })}`; };

  // Dragging works with a mouse; on a phone it's tap the workout, then tap the day.
  const dragProps = key => ({
    draggable: true,
    onDragStart: e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', key); setDragKey(key); },
    onDragEnd: () => { setDragKey(null); setOver(null); },
  });
  const placing = picking || dragKey;

  return (
    <div class="stack schedule">
      <div>
        {back}
        <div class="eyebrow">Block {block.num}</div>
        <h1 class="t-title">Schedule</h1>
      </div>

      <section class="panel" aria-labelledby="upnext-h">
        <div class="split"><h2 class="t-h2" id="upnext-h">Up next</h2><span class="small muted">The next of each workout that isn't done or on the schedule</span></div>
        {upNext.length ? (
          <>
            <div class="tray">
              {upNext.map(k => (
                <button type="button" key={k} class="chip-w" aria-pressed={picking === k ? 'true' : 'false'} disabled={busy}
                  onClick={() => setPicking(picking === k ? null : k)} {...dragProps(k)}>
                  <Icon name={parts(k).w.icon} />{parts(k).w.name}<span class="wk">Week {parts(k).week}</span>
                </button>
              ))}
            </div>
            <p class="small muted" style={{ margin: 0 }}>Tap a workout, then tap a day. On a computer you can also drag it onto a day.</p>
          </>
        ) : <p class="small muted" style={{ margin: 0 }}>Everything left in this block is on the schedule.</p>}
      </section>

      {picking && (
        <div class="placing" role="status">
          <CalendarPlus aria-hidden="true" /><span>Placing <b>{label(picking)}</b>. Tap a day, today or later.</span>
          <button type="button" class="btn" onClick={() => setPicking(null)}>Cancel</button>
        </div>
      )}

      <div class="weeknav">
        <button type="button" class="btn" onClick={() => setWeekStart(mondayOf(today))}>Today</button>
        <button type="button" class="iconbtn" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft aria-hidden="true" /></button>
        <button type="button" class="iconbtn" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight aria-hidden="true" /></button>
        <span class="range">{range}</span>
      </div>

      <div class="days">
        {days.map(day => {
          const keys = keysOn(day);
          const past = day < today;
          const target = !!placing && !past;
          const pick = () => { if (picking && !past) place(picking, day); };
          return (
            <div key={day} class={`day${day === today ? ' today' : ''}${past ? ' past' : ''}${target ? ' target' : ''}${over === day ? ' over' : ''}`}
              role={picking && !past ? 'button' : undefined} tabindex={picking && !past ? 0 : undefined}
              aria-label={picking && !past ? `Put it on ${dayLong(day)}` : undefined}
              onClick={pick}
              onKeyDown={e => { if (picking && !past && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(); } }}
              onDragOver={e => { if (dragKey && !past) { e.preventDefault(); setOver(day); } }}
              onDragLeave={() => setOver(o => (o === day ? null : o))}
              onDrop={e => { if (!dragKey || past) return; e.preventDefault(); place(dragKey, day); }}>
              <div class="day-label">
                <span class="dow">{dayName(day)}</span><span class="dnum">{fmt(day, { day: 'numeric' })}</span>
                {day === today && <span class="tag">Today</span>}
              </div>
              <div class="day-items">
                {keys.map(k => {
                  const state = progress[k]?.state || 'none';
                  const { week, w } = parts(k);
                  return (
                    <button type="button" key={k} class={`stile ${state}${picking === k ? ' selected' : ''}`}
                      aria-label={`${w.name}, week ${week}, ${STATE_TEXT[state]}`}
                      onClick={e => { if (picking) return; e.stopPropagation(); setSheet(k); }}
                      {...(trained(k) ? {} : dragProps(k))}>
                      <Icon name={w.icon} />
                      <span class="txt"><span class="name">{w.name}</span><span class="sub">Week {week}</span></span>
                      <span class="state">{STATE_TEXT[state]}</span>
                    </button>
                  );
                })}
                {target && <div class="drop-hint">+ Put it here</div>}
                {!keys.length && !target && !past && <span class="empty-day">Rest</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div class="legend"><span><i />Not started</span><span><i class="progress" />In progress</span><span><i class="done" />Done</span><span><i class="incomplete" />Finished early</span></div>

      {sheet && (
        <Sheet title={label(sheet)} onClose={() => setSheet(null)}>
          <p class="small muted" style={{ margin: 0 }}>
            {trained(sheet)
              ? `${STATE_TEXT[progress[sheet].state]} · trained on ${dayLong(dayOf(sheet))}. Trained workouts stay on the day they were trained.`
              : `Not started · on the schedule for ${dayLong(dayOf(sheet))}.`}
          </p>
          <a class="btn primary" style={{ textDecoration: 'none', textAlign: 'center' }} href={workoutHref(sheet)}>Open workout</a>
          {!trained(sheet) && (
            <>
              <button type="button" class="btn" disabled={busy} onClick={() => { setPicking(sheet); setSheet(null); if (dayOf(sheet) < weekStart) setWeekStart(mondayOf(today)); }}>Move to another day</button>
              <button type="button" class="btn" disabled={busy} onClick={() => unplan(sheet)}>Take off the schedule</button>
            </>
          )}
          <button type="button" class="btn ghost" onClick={() => setSheet(null)}>Close</button>
        </Sheet>
      )}
      {toastView}
    </div>
  );
}

export default function Schedule() {
  return <Shell>{me => (me.schedule ? <ScheduleBody /> : <><a class="back" href="/training/">‹ My block</a><p class="muted">The schedule isn't switched on for you.</p></>)}</Shell>;
}
