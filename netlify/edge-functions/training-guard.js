// Sends anyone without a valid login cookie to the training login page.
// The API functions do the full checks (paused, password changed), so this only checks the signature.
import { readCookie, verifySession } from '../lib/training/session.js';

export default async (request, context) => {
  const payload = await verifySession(readCookie(request), Netlify.env.get('TRAINING_SESSION_SECRET'));
  if (payload) return context.next();
  const url = new URL(request.url);
  const login = new URL('/training/login/', url);
  login.searchParams.set('next', url.pathname + url.search);
  return Response.redirect(login, 302);
};

export const config = {
  path: ['/training', '/training/*'],
  excludedPath: ['/training/login', '/training/login/*'],
};
