/** Order numbers like PYV-7KQ2MD: 6 characters without look-alikes (no 0, O, 1 or I). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomChars(n: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export const newOrderNumber = () => `PYV-${randomChars(6)}`;

/** Secret for the private order link in emails (24 URL-safe characters, 144 bits). */
export function newAccessKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Buffer.from(bytes).toString('base64url');
}

/** Accepts "pyv-7kq2md", "PYV7KQ2MD" or " PYV-7KQ2MD " and returns "PYV-7KQ2MD", or null. */
export function normalizeOrderNumber(input: string): string | null {
  const s = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = /^PYV([A-HJ-NP-Z2-9]{6})$/.exec(s);
  return m ? `PYV-${m[1]}` : null;
}
