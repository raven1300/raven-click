// Calls the training API. A 401 sends the browser to the login page.
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api/training/${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Couldn\'t reach the server. Check your connection and try again.', 0, null);
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (res.status === 401 && path !== 'login') {
    window.location.href = `/training/login/?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
  if (!res.ok) throw new ApiError(data?.message || `Something went wrong (${res.status}).`, res.status, data);
  return data;
}

// A message shown once on the next page, for example after saving a block.
export function setFlash(message) {
  try { sessionStorage.setItem('training-flash', message); } catch {}
}
export function takeFlash() {
  try {
    const message = sessionStorage.getItem('training-flash');
    sessionStorage.removeItem('training-flash');
    return message;
  } catch {
    return null;
  }
}

// "Log for someone else": who you're logging for, kept for this browser tab only,
// so it switches back by itself when the tab is closed.
export function logFor() {
  try { return JSON.parse(sessionStorage.getItem('training-log-for')); } catch { return null; }
}
export function startLogFor(person) {
  try { sessionStorage.setItem('training-log-for', JSON.stringify({ id: person.id, name: person.name })); } catch {}
}
export function stopLogFor() {
  try { sessionStorage.removeItem('training-log-for'); } catch {}
}
// Choosing anyone else under Viewing (yourself included) counts as switching back.
export function viewingChanged(personId) {
  if (logFor() && logFor().id !== personId) stopLogFor();
}
