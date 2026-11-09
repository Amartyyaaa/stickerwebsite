import { devices, expect, test, type BrowserContext } from '@playwright/test';
import { unzipSync } from 'fflate';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { B, check, clearRateLimits, IMG, mails, nav, one, orderNumberIn, OWNER, runTag, sidewaysScroll, signIn, waitFor, watchErrors } from './support';

/** Places an order as a shopper: three posters with COD, or a custom sticker paid online. */
async function placeOrder(ctx: BrowserContext, { email, cod, custom }: { email: string; cod: boolean; custom?: boolean }) {
  const p = await ctx.newPage();
  if (custom) {
    await nav(p, '/custom/stickers');
    await p.setInputFiles('input[type=file]', `${IMG}/logo-transparent.png`);
    await p.waitForSelector('p[role=status]:has-text("Sharp at")', { timeout: 30000 });
    await p.click('label:has-text("Circle")');
    await p.click('button:has-text("Add to cart")');
    await p.keyboard.press('Escape');
  } else {
    await nav(p, '/c/wall-posters');
    for (let i = 0; i < 3; i++) {
      await p.getByRole('button', { name: /^Add .* to cart$/ }).nth(i).click();
      await p.keyboard.press('Escape');
    }
  }
  await nav(p, '/checkout');
  await p.fill('#contact-email', email);
  await p.fill('#contact-phone', '98765 43210');
  await p.fill('#addr-name', 'Meera Iyer');
  await p.fill('#addr-line1', '7, Palm Grove');
  await p.fill('#addr-pincode', '600020');
  await p.fill('#addr-city', 'Chennai');
  await p.selectOption('#addr-state', 'Tamil Nadu');
  if (cod) {
    await p.locator('label:has-text("Cash on Delivery")').click();
    await p.waitForSelector('dt:has-text("Cash on Delivery fee")');
  } else await p.waitForSelector('dt:has-text("Online payment discount")');
  await p.locator('main form button[type=submit]').click();
  if (!cod) {
    await p.waitForSelector('dialog[open] >> text=Test payment');
    await p.click('dialog[open] button:has-text("Pay ₹")');
  }
  await p.waitForURL(/\/order\/PYV-/, { timeout: 20000 });
  const number = orderNumberIn(p.url());
  await p.close();
  return number;
}

/** Admin access, working an order through to delivery, slips and receipts, customer files, refunds and search. */
test('admin: orders from placed to delivered, files and refunds', async ({ browser }) => {
  await clearRateLimits();
  const tag = runTag();
  const errors: string[] = [];

  await test.step('guests sign in first; other accounts get "No access"', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    watchErrors(p, errors, 'visitor');
    await p.goto(`${B}/admin`, { waitUntil: 'load' });
    check('admin asks guests to sign in', (await p.locator('#signin-email').count()) === 1);
    await signIn(p, `shopper.${tag}@example.com`, '/admin');
    await p.waitForSelector('h1:has-text("No access")', { timeout: 15000 });
    const res = await p.request.get(`${B}/api/admin/files/zip/PYV-AAAAAA`);
    check('customer files are refused to non-admins', res.status() === 403, `${res.status()}`);
    await ctx.close();
  });

  const shopper = await browser.newContext();
  const shopperEmail = `meera.${tag}@example.com`;
  const codNumber = await placeOrder(shopper, { email: shopperEmail, cod: true });
  const customNumber = await placeOrder(shopper, { email: shopperEmail, cod: false, custom: true });

  const admin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const a = await admin.newPage();
  watchErrors(a, errors, 'admin');

  await test.step('the owner works the COD order through to delivery', async () => {
    await signIn(a, OWNER, '/admin');
    await a.waitForSelector('h1:has-text("Dashboard")', { timeout: 15000 });
    await a.waitForSelector('h2:has-text("Needs attention")', { timeout: 15000 }).catch(() => {});
    check('admin signs in and sees the dashboard', (await a.locator('h2:has-text("Needs attention")').count()) === 1);
    await a.goto(`${B}/admin/orders?tab=to_confirm`, { waitUntil: 'load' });
    check('COD order waits in "To confirm"', (await a.locator(`a:has-text("${codNumber}")`).count()) === 1, codNumber);
    await a.click(`a:has-text("${codNumber}")`);
    await a.waitForSelector(`h1:has-text("Order ${codNumber}")`);
    const wa = (await a.locator('a:has-text("Confirm on WhatsApp")').getAttribute('href')) ?? '';
    check('WhatsApp confirm link goes to the customer with the order', wa.startsWith('https://wa.me/919876543210?text=') && decodeURIComponent(wa).includes(codNumber));
    await a.click('button:has-text("Mark confirmed")');
    await a.waitForSelector('button:has-text("Start printing")');
    await a.click('button:has-text("Start printing")');
    await a.waitForSelector('button:has-text("Mark shipped")');
    await a.click('button:has-text("Mark shipped")');
    await a.selectOption('#ship-courier', 'Delhivery');
    await a.fill('#ship-awb', `DLV${tag}99`);
    check('known couriers fill in the tracking link', (await a.locator('#ship-link-hint').innerText()).includes(`delhivery.com/track/package/DLV${tag}99`));
    await a.click('button:has-text("Save and email the customer")');
    await a.waitForSelector('button:has-text("Mark delivered")');
    const shippedMail = await waitFor(() => mails(shopperEmail).find((m) => m.subject.includes(`${codNumber} has shipped`)));
    check('customer gets the shipped email with tracking', Boolean(shippedMail?.text.includes(`DLV${tag}99`)));
    const p = await shopper.newPage();
    await nav(p, '/track');
    await p.fill('#track-number', codNumber);
    await p.fill('#track-phone', '9876543210');
    await p.click('button:has-text("Track order")');
    await p.waitForSelector('a:has-text("Track parcel")', { timeout: 10000 });
    check('track page shows the courier link', ((await p.locator('a:has-text("Track parcel")').getAttribute('href')) ?? '').includes(`DLV${tag}99`));
    await p.close();
    await a.click('button:has-text("Mark delivered")');
    // "Delivered" is on the page as a timeline step before the change saves, so wait for the saved status.
    const row = (await waitFor(async () => {
      const r = await one('select status, payment_status from orders where number = ?', [codNumber]);
      return r?.status === 'delivered' ? r : null;
    }))!;
    check('delivered COD order is marked paid (cash collected)', row.status === 'delivered' && row.payment_status === 'paid');
    check('customer gets the delivered email', Boolean(await waitFor(() => mails(shopperEmail).find((m) => m.subject.includes(`${codNumber} was delivered`)))));
  });

  await test.step('packing slip and receipt', async () => {
    await a.goto(`${B}/admin/orders/${codNumber}/slip`, { waitUntil: 'load' });
    await a.waitForSelector('text=Packing slip');
    const slip = await a.locator('.paper').innerText();
    check('packing slip shows the order and address', slip.includes(codNumber) && slip.includes('600020'));
    await a.goto(`${B}/admin/orders/${codNumber}/receipt`, { waitUntil: 'load' });
    await a.waitForSelector('.paper >> text=Receipt');
    check('receipt shows totals', /Total/.test(await a.locator('.paper').innerText()));
  });

  await test.step('custom files: original, print file and zip', async () => {
    await a.goto(`${B}/admin/orders/${customNumber}`, { waitUntil: 'load' });
    await a.waitForSelector(`h1:has-text("Order ${customNumber}")`);
    const orig = await a.request.get(`${B}${await a.locator('a:has-text("Original")').first().getAttribute('href')}`);
    const origBuf = await orig.body();
    check('original downloads untouched', orig.status() === 200 && origBuf.equals(readFileSync(`${IMG}/logo-transparent.png`)) && /attachment/.test(orig.headers()['content-disposition'] ?? ''));
    const print = await a.request.get(`${B}${await a.locator('a:has-text("Print file")').first().getAttribute('href')}`);
    const meta = await sharp(await print.body()).metadata();
    check('print file is a full-size PNG of the crop', print.status() === 200 && meta.format === 'png' && meta.width === 1400 && meta.height === 1400, `${meta.width}x${meta.height}`);
    const zip = await a.request.get(`${B}/api/admin/files/zip/${customNumber}`);
    const names = Object.keys(unzipSync(new Uint8Array(await zip.body())));
    check('zip has the original, print file and design notes', names.some((n) => n.includes('original')) && names.some((n) => n.includes('print')) && names.includes('design.txt'), names.join(', '));
  });

  await test.step('cancel and refund a paid order', async () => {
    await a.click('button:has-text("Cancel order")');
    await a.fill('#cancel-reason', 'Customer asked to cancel');
    await a.click('button:has-text("Cancel the order")');
    await a.waitForSelector('button:has-text("Refund")', { timeout: 10000 });
    await a.click('button:has-text("Refund")');
    await a.fill('#refund-ref', `UPI${tag}`);
    await a.click('button:has-text("Record the refund")');
    await a.waitForSelector('text=refunded ₹', { timeout: 10000 });
    const rf = (await one('select status, payment_status, refunded_amount, total from orders where number = ?', [customNumber]))!;
    check('full refund marks the order refunded', rf.status === 'refunded' && rf.payment_status === 'refunded' && rf.refunded_amount === rf.total);
    check(
      'customer gets cancel and refund emails',
      Boolean(await waitFor(() => mails(shopperEmail).find((m) => m.subject.includes('Refund of')))) && mails(shopperEmail).some((m) => m.subject.includes(`${customNumber} was cancelled`)),
    );
  });

  await test.step('search and phone layouts', async () => {
    await a.goto(`${B}/admin/orders?q=${encodeURIComponent(shopperEmail)}`, { waitUntil: 'load' });
    check('search by email finds both orders', (await a.locator('tbody tr').count()) === 2);
    const ph = await browser.newContext({ ...devices['iPhone 13'], storageState: await admin.storageState() });
    const m = await ph.newPage();
    for (const path of ['/admin', '/admin/orders', `/admin/orders/${codNumber}`]) {
      await m.goto(B + path, { waitUntil: 'load' });
      await m.waitForSelector('main h1');
      const over = await sidewaysScroll(m);
      check(`no sideways scroll on phone ${path}`, over <= 0, `${over}px`);
    }
    await ph.close();
  });

  await shopper.close();
  await admin.close();
  expect(errors, 'no script errors in the browser').toEqual([]);
});
