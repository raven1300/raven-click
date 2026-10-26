import { useState } from 'preact/hooks';
import { api } from './api.js';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!password.trim()) { setError('Enter your password.'); return; }
    setBusy(true);
    setError('');
    try {
      await api('login', { method: 'POST', body: { password } });
      const next = new URLSearchParams(window.location.search).get('next') || '';
      window.location.href = next.startsWith('/training') ? next : '/training/';
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form class="login stack" onSubmit={submit}>
      <div>
        <div class="eyebrow">raven.click</div>
        <h1 class="t-title">Training</h1>
        <p class="meta">Enter the password Nick gave you.</p>
      </div>
      <label class="label" for="password">
        <span class="meta">Password</span>
        <input id="password" class="input" type="password" autocomplete="current-password" value={password} onInput={e => setPassword(e.currentTarget.value)} />
      </label>
      {error && <p class="error-box" role="alert">{error}</p>}
      <button class="btn primary big" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
    </form>
  );
}
