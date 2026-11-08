import { test, type Browser } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { E2E, serverEnv } from './env';
import { B, check, clearRateLimits, db, nav, one, runTag } from './support';

/** Places an online order and closes the payment window, leaving it waiting for payment. */
async function pendingOrder(browser: Browser, email: string) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await nav(p, '/c/laptop-stickers');
  await p.getByRole('button', { name: /^Add .* to cart$/ }).first().click();
  await nav(p, '/checkout');
  await p.fill('#contact-email', email);
  await p.fill('#contact-phone', '9876543210');
  await p.fill('#addr-name', 'Webhook Test');
  await p.fill('#addr-line1', '1 Test Street');
  await p.fill('#addr-pincode', '110001');
  await p.fill('#addr-city', 'New Delhi');
  await p.selectOption('#addr-state', 'Delhi');
  await p.waitForSelector('dt:has-text("Online payment discount")');
  await p.locator('main form button[type=submit]').click();
  await p.waitForSelector('dialog[open] >> text=Test payment');
  await p.click('dialog[open] button[aria-label="Close the payment window"]');
  await p.waitForSelector('text=Payment cancelled');
  const n = (await p.locator('text=Payment cancelled').innerText()).match(/PYV-[A-Z0-9]{6}/)![0];
  await ctx.close();
  return n;
}

const order = async (n: string) => (await one('select * from orders where number = ?', [n]))!;
const sign = (body: string) => createHmac('sha256', E2E.webhookSecret).update(body).digest('hex');
const send = (body: string, sig: string, id: string) =>
  fetch(`${B}/api/payments/razorpay/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig, 'x-razorpay-event-id': id }, body });

/** Razorpay's webhook marks orders paid even if the shopper closes the tab; bad, replayed or wrong-amount calls change nothing. */
test('payment webhook, nightly clean-up and changed prices', async ({ browser }) => {
  await clearRateLimits();
  const tag = runTag();

  await test.step('a signed webhook marks the order paid, once', async () => {
    const n1 = await pendingOrder(browser, `hook1.${tag}@example.com`);
    const o1 = await order(n1);
    check('cancelled checkout leaves a pending order', o1.status === 'pending_payment' && o1.payment_status === 'unpaid', n1);
    await db.execute({ sql: 'update orders set razorpay_order_id = ? where id = ?', args: [`order_T${o1.id}`, o1.id] });
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: `pay_T${o1.id}`, order_id: `order_T${o1.id}`, amount: Number(o1.total), currency: 'INR' } } } });
    const bad = await send(body, sign(body).replace(/^./, '0'), `evt_bad_${o1.id}`);
    check('webhook with a bad signature is refused', bad.status === 400, `${bad.status}`);
    const good = await send(body, sign(body), `evt_${o1.id}`);
    const after1 = await order(n1);
    check('signed webhook marks the order paid', good.status === 200 && after1.status === 'placed' && after1.payment_status === 'paid' && after1.razorpay_payment_id === `pay_T${o1.id}`);
    const again = await send(body, sign(body), `evt_${o1.id}`);
    const j = await again.json();
    const events = (await one("select count(*) n from order_events where order_id = ? and status = 'placed'", [o1.id]))!.n;
    check('replayed webhook changes nothing', j.duplicate === true && Number(events) === 1);
    await new Promise((r) => setTimeout(r, 800));
    const sent = readdirSync(E2E.outbox).filter((f) => f.includes(n1.toLowerCase())).length;
    check('webhook payment sends the order emails', sent >= 2, `${sent} emails`);
  });

  await test.step('a wrong amount is refused; the nightly clean-up cancels old unpaid orders', async () => {
    const n2 = await pendingOrder(browser, `hook2.${tag}@example.com`);
    const o2 = await order(n2);
    await db.execute({ sql: 'update orders set razorpay_order_id = ? where id = ?', args: [`order_T${o2.id}`, o2.id] });
    const body2 = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: `pay_T${o2.id}`, order_id: `order_T${o2.id}`, amount: 100, currency: 'INR' } } } });
    await send(body2, sign(body2), `evt_${o2.id}`);
    check('a payment for the wrong amount is not accepted', (await order(n2)).status === 'pending_payment');
    await db.execute({ sql: 'update orders set created_at = created_at - 2 * 86400 where id = ?', args: [o2.id] });
    const log = execFileSync('npm', ['run', '--silent', 'maintenance'], { cwd: E2E.root, env: { ...process.env, ...serverEnv }, encoding: 'utf8' });
    check('maintenance cancels old unpaid orders', (await order(n2)).status === 'cancelled', log.trim().split('\n').pop());
  });

  await test.step('prices that changed between the quote and the order stop it', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await nav(p, '/c/laptop-stickers');
    await p.getByRole('button', { name: /^Add .* to cart$/ }).first().click();
    await p.route('**/api/cart/quote', async (route) => {
      const res = await route.fetch();
      const json = await res.json();
      json.summary.total += 500;
      await route.fulfill({ response: res, json });
    });
    await nav(p, '/checkout');
    const email = `stale.${tag}@example.com`;
    await p.fill('#contact-email', email);
    await p.fill('#contact-phone', '9876543210');
    await p.fill('#addr-name', 'Stale Price');
    await p.fill('#addr-line1', '1 Test Street');
    await p.fill('#addr-pincode', '110001');
    await p.fill('#addr-city', 'New Delhi');
    await p.selectOption('#addr-state', 'Delhi');
    await p.waitForTimeout(800);
    await p.locator('main form button[type=submit]').click();
    await p.waitForSelector('text=Prices changed', { timeout: 10000 }).catch(() => {});
    const none = (await one('select count(*) n from orders where email = ?', [email]))!.n;
    check('a changed total stops the order', (await p.locator('text=Prices changed').count()) === 1 && Number(none) === 0);
    await ctx.close();
  });
});
