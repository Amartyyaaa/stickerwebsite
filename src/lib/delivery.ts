import type { StoreSettings } from '@/lib/settings';

/**
 * A simple delivery estimate from the first digits of an Indian pincode.
 * Metro cities ship fastest; the North-East, Jammu & Kashmir, Ladakh and the
 * islands take longest. Replace with your courier's serviceability API later.
 */
const METRO_PREFIXES = ['11', '40', '41', '50', '56', '60', '70', '38', '122', '201', '400', '411'];
const REMOTE_PREFIXES = ['18', '19', '78', '79', '737', '744', '682'];

export const isPincode = (v: string) => /^[1-9][0-9]{5}$/.test(v);

export function deliveryWindow(pincode: string, d: StoreSettings['delivery']): [number, number] {
  if (REMOTE_PREFIXES.some((p) => pincode.startsWith(p))) return d.remoteDays;
  if (METRO_PREFIXES.some((p) => pincode.startsWith(p))) return d.metroDays;
  return d.standardDays;
}

export function formatDeliveryDate(from: Date, days: number): string {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
