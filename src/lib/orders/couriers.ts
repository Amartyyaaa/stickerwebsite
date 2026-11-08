/**
 * Couriers commonly used by Indian online stores. Where we know the public
 * tracking page's address, the tracking link is filled in automatically;
 * otherwise paste the link from the courier's booking screen.
 */
export const COURIERS: ReadonlyArray<{ id: string; name: string; track?: (awb: string) => string }> = [
  { id: 'delhivery', name: 'Delhivery', track: (n) => `https://www.delhivery.com/track/package/${n}` },
  { id: 'shiprocket', name: 'Shiprocket', track: (n) => `https://shiprocket.co/tracking/${n}` },
  { id: 'bluedart', name: 'Blue Dart' },
  { id: 'dtdc', name: 'DTDC' },
  { id: 'xpressbees', name: 'Xpressbees' },
  { id: 'ecom', name: 'Ecom Express' },
  { id: 'shadowfax', name: 'Shadowfax' },
  { id: 'indiapost', name: 'India Post' },
  { id: 'other', name: 'Other' },
];

const AWB_RE = /^[A-Za-z0-9-]{4,40}$/;

export const isTrackingNumber = (n: string) => AWB_RE.test(n.trim());

/** The tracking page for this courier and tracking number, if we know it. */
export function trackingUrlFor(courierName: string, trackingNumber: string): string | null {
  const c = COURIERS.find((x) => x.name === courierName);
  const n = trackingNumber.trim();
  return c?.track && isTrackingNumber(n) ? c.track(encodeURIComponent(n)) : null;
}

/** Only http(s) links are stored, so a pasted link can't run script in a shopper's browser. */
export function safeHttpUrl(input: string): string | null {
  try {
    const u = new URL(input.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}
