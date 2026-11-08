import 'server-only';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { adminEmails } from '@/lib/site';

export interface Viewer {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

/**
 * The signed-in shopper, or null. Reads cookies, so only call it inside
 * <Suspense> (or in server actions and route handlers).
 */
export async function getViewer(): Promise<Viewer | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const email = s.user.email.toLowerCase();
  return { id: s.user.id, email, name: s.user.name, emailVerified: s.user.emailVerified, isAdmin: s.user.emailVerified && adminEmails().includes(email) };
}
