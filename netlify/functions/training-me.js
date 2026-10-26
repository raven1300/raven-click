import { currentUser, handle, json } from '../lib/training/http.js';

export default async (req) => handle(async () => {
  const user = await currentUser(req);
  if (user instanceof Response) return user;
  return json({ id: user.id, name: user.person.name, admin: !!user.person.admin });
});

export const config = { path: '/api/training/me' };
