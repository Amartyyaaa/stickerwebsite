/** What the checkout page gets back from the server. Safe to import in the browser. */

export type PaymentStart =
  | { mode: 'cod' }
  | { mode: 'mock'; amount: number }
  | { mode: 'razorpay'; keyId: string; razorpayOrderId: string; amount: number; prefill: { name: string; email: string; contact: string } };

export type PlaceOrderResult =
  | { ok: true; number: string; key: string; payment: PaymentStart }
  | {
      ok: false;
      error: string;
      /** Field name → message, for showing next to inputs. */
      fields?: Record<string, string>;
      /** The cart or prices changed: refresh the summary before trying again. */
      refresh?: boolean;
    };

export type ActionResult = { ok: true } | { ok: false; error: string };
