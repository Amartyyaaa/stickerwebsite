import 'server-only';
import type { StoreSettings } from '@/lib/settings';
import { paymentsMode } from './razorpay';

/**
 * How shoppers can pay, for the text on pages. Online payment (UPI, cards, netbanking,
 * wallets) is on once Razorpay keys are set; until then the store takes Cash on Delivery only.
 * Most of these pages are prebuilt, so after adding Razorpay keys run `sudo pyv deploy`.
 */
export const onlinePayments = () => paymentsMode() !== 'off';

/** A short badge, like "UPI, cards & COD". */
export const payBadge = () => (onlinePayments() ? 'UPI, cards & COD' : 'Cash on Delivery');

/** The full list, like "UPI, cards, netbanking or Cash on Delivery". */
export const payLine = () => (onlinePayments() ? 'UPI, cards, netbanking or Cash on Delivery' : 'Cash on Delivery');

/** The methods shown as chips in the footer. */
export const payMethods = () => (onlinePayments() ? ['UPI', 'Cards', 'Netbanking', 'Wallets', 'Cash on Delivery'] : ['Cash on Delivery']);

/** How a custom print can be paid for, which depends on the COD settings too. */
export function customPayNote(s: Pick<StoreSettings, 'cod'>): string {
  if (!onlinePayments()) return 'Pay with Cash on Delivery when it arrives.';
  if (s.cod.enabled && s.cod.allowCustom) return 'Pay online or with Cash on Delivery.';
  return 'Pay online with UPI, cards, netbanking or wallets.';
}
