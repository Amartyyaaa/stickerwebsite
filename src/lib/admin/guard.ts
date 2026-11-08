import 'server-only';
import { getViewer, type Viewer } from '@/lib/viewer';

/** Thrown when someone who isn't on the ADMIN_EMAILS list tries an admin action. */
export class NotAdminError extends Error {
  constructor() {
    super('Only store admins can do that. Please sign in with an admin email.');
  }
}

/** The signed-in admin, or an error. Every admin server action and route starts with this. */
export async function requireAdmin(): Promise<Viewer> {
  const v = await getViewer();
  if (!v?.isAdmin) throw new NotAdminError();
  return v;
}

/** The signed-in admin, or null (for pages, which show a sign-in or "no access" screen instead). */
export async function adminOrNull(): Promise<Viewer | null> {
  const v = await getViewer();
  return v?.isAdmin ? v : null;
}
