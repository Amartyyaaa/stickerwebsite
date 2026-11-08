import 'server-only';
import { googleEnabled } from '@/lib/auth';
import { emailReady } from '@/lib/email/send';

/**
 * Shoppers can have accounts when they can sign in: by email code (needs email sending)
 * or with Google. Until then, account links are hidden and orders are tracked by number and phone.
 */
export const shopperAccounts = () => emailReady() || googleEnabled;
