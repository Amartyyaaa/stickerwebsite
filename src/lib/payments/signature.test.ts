import { describe, expect, it } from 'vitest';
import { verifyPaymentSignature, verifyWebhookSignature } from './signature';

// Fixed values, so a change to how signatures are built is caught.
const PAYMENT = { orderId: 'order_PYV1234567890', paymentId: 'pay_PYV0987654321', signature: '9a4a1400c04cf057dfc153bb4aceefc4cb0cfa6ebdebcc93f0f9ed6e946ab3a7' };
const BODY = '{"event":"payment.captured"}';
const WEBHOOK_SIG = '149f0921b8dab66ba5504a4de4e376f5e30470d680899c30ffda46ef7391a360';

describe('Razorpay payment signature', () => {
  it('accepts the right signature', () => {
    expect(verifyPaymentSignature(PAYMENT, 'test_key_secret')).toBe(true);
  });
  it('rejects a wrong secret, a swapped id or a tampered signature', () => {
    expect(verifyPaymentSignature(PAYMENT, 'other_secret')).toBe(false);
    expect(verifyPaymentSignature({ ...PAYMENT, paymentId: 'pay_other' }, 'test_key_secret')).toBe(false);
    expect(verifyPaymentSignature({ ...PAYMENT, signature: PAYMENT.signature.replace(/.$/, '0') }, 'test_key_secret')).toBe(false);
    expect(verifyPaymentSignature({ ...PAYMENT, signature: 'short' }, 'test_key_secret')).toBe(false);
    expect(verifyPaymentSignature(PAYMENT, '')).toBe(false);
  });
});

describe('Razorpay webhook signature', () => {
  it('accepts the right signature for the exact body', () => {
    expect(verifyWebhookSignature(BODY, WEBHOOK_SIG, 'test_webhook_secret')).toBe(true);
  });
  it('rejects a changed body, a missing signature or a missing secret', () => {
    expect(verifyWebhookSignature(BODY.replace('captured', 'failed'), WEBHOOK_SIG, 'test_webhook_secret')).toBe(false);
    expect(verifyWebhookSignature(BODY, null, 'test_webhook_secret')).toBe(false);
    expect(verifyWebhookSignature(BODY, WEBHOOK_SIG, '')).toBe(false);
  });
});
