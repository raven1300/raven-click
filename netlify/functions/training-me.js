import { currentUser, handle, json } from '../lib/training/http.js';
import { isPreviewStore } from '../lib/training/store.js';

export default async (req, context) => handle(async () => {
  const user = await currentUser(req);
  if (user instanceof Response) return user;
  return json({ id: user.id, name: user.person.name, admin: !!user.person.admin, preview: isPreviewStore() });
}, context);

export const config = { path: '/api/training/me' };
