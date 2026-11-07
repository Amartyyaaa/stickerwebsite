'use client';

import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/** Sign-in from the browser. Uses the current site address, so it works on any domain. */
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
