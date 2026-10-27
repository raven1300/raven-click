import { useEffect, useState } from 'preact/hooks';
import { api, logFor, stopLogFor } from './api.js';

// Loads who's logged in, then renders the page. Handles paused access and log out.
export default function Shell({ adminOnly = false, children }) {
  const [me, setMe] = useState(null);
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    api('me').then(setMe).catch(err => setProblem(err.data?.paused ? 'paused' : err.message));
  }, []);

  const logOut = async () => {
    try { await api('login', { method: 'DELETE' }); } catch {}
    window.location.href = '/training/login/';
  };

  if (problem === 'paused') return <p class="notice">Your access is paused. Ask Nick.</p>;
  if (problem) return <p class="error-box">{problem}</p>;
  if (!me) return <p class="muted">Loading…</p>;
  if (adminOnly && !me.admin) return <p class="error-box">Only Nick can use this page.</p>;

  const helping = logFor();
  const switchBack = () => { stopLogFor(); window.location.href = '/training/'; };

  return (
    <div class="stack">
      {me.preview && <p class="notice small">Preview data: separate from the live site, for testing only.</p>}
      {helping && helping.id !== me.id && (
        <div class="logfor-banner" role="status">
          <span>Logging for <b>{helping.name}</b></span>
          <button class="btn" onClick={switchBack}>Switch back</button>
        </div>
      )}
      {children(me)}
      <div class="split small muted">
        <span>Logged in as {me.name}</span>
        <button class="btn ghost" onClick={logOut}>Log out</button>
      </div>
    </div>
  );
}
