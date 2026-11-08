import { devices, expect, test, type Page } from '@playwright/test';
import { B, check, clearRateLimits, db, IMG, mails, nav, orderNumberIn, OWNER, runTag, sidewaysScroll, waitFor, watchErrors } from './support';

async function fillCheckout(p: Page, { email, phone = '98765 43210', name = 'Asha Rao' }: { email: string; phone?: string; name?: string }) {
  await p.fill('#contact-email', email);
  await p.fill('#contact-phone', phone);
  await p.fill('#addr-name', name);
  await p.fill('#addr-line1', '12, Lake View Apartments');
  await p.fill('#addr-line2', 'MG Road');
  await p.fill('#addr-pincode', '560001');
  await p.fill('#addr-city', 'Bengaluru');
  await p.selectOption('#addr-state', 'Karnataka');
}

async function addStickers(p: Page, n: number) {
  await nav(p, '/c/laptop-stickers');
  for (let i = 0; i < n; i++) {
    await p.getByRole('button', { name: /^Add .* to cart$/ }).nth(i).click();
    await p.keyboard.press('Escape');
  }
}

/** Guest Cash on Delivery, tracking, online payment, a custom sticker, signing in with a code, and phone layouts. */
test('checkout: COD, online payment, custom items and accounts', async ({ browser }) => {
  await clearRateLimits();
  const guest = `guest.${runTag()}@example.com`;
  const errors: string[] = [];
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  watchErrors(p, errors);
  let codUrl = '';

  await test.step('guest Cash on Delivery order', async () => {
    await addStickers(p, 4);
    await nav(p, '/c/wall-posters');
    await p.getByRole('button', { name: /^Add .* to cart$/ }).first().click();
    await p.keyboard.press('Escape');
    await nav(p, '/checkout');
    await p.waitForSelector('text=Your order');
    await p.locator('main form button[type=submit]').click();
    const flagged = await p.locator('[aria-invalid="true"]').count();
    check('missing details are flagged', flagged >= 5, `${flagged} fields`);
    await fillCheckout(p, { email: guest });
    check('pincode shows a delivery estimate', /Usually delivered/.test(await p.locator('#addr-pincode-hint').innerText().catch(() => '')));
    await p.locator('label:has-text("Cash on Delivery")').click();
    await p.waitForSelector('dt:has-text("Cash on Delivery fee")', { timeout: 10000 });
    await p.locator('main form button[type=submit]').click();
    await p.waitForURL(/\/order\/PYV-[A-Z0-9]{6}\?key=.*placed=1/, { timeout: 20000 });
    codUrl = p.url();
    const codNumber = orderNumberIn(codUrl);
    await p.waitForSelector('h1:has-text("Thanks, Asha")', { timeout: 15000 }).catch(() => {});
    check('order page thanks the shopper', (await p.locator('h1:visible:has-text("Thanks, Asha")').count()) === 1);
    check('COD note shown', (await p.locator('text=Cash on Delivery:').count()) === 1);
    const custMail = await waitFor(() => mails(guest).find((m) => m.subject.includes(codNumber)));
    check('confirmation email to the shopper', Boolean(custMail), custMail?.subject);
    const ownerMail = await waitFor(() => mails(OWNER).find((m) => m.subject.includes(codNumber)));
    check('new-order email to the owner', Boolean(ownerMail), ownerMail?.subject);
    check('email link opens the order', Boolean(custMail?.text.includes(`/order/${codNumber}?key=`)));
  });

  await test.step('tracking', async () => {
    const codNumber = orderNumberIn(codUrl);
    await nav(p, '/track');
    await p.fill('#track-number', codNumber.toLowerCase());
    await p.fill('#track-phone', '9876543210');
    await p.click('button:has-text("Track order")');
    await p.waitForSelector(`text=${codNumber}`, { timeout: 10000 });
    check('tracking finds the order', (await p.locator('ol[aria-label="Order progress"]').count()) === 1);
    await p.fill('#track-phone', '9123456780');
    await p.click('button:has-text("Track order")');
    await p.waitForSelector('text=couldn’t find an order', { timeout: 10000 });
    const noKey = await (await fetch(`${B}/order/${codNumber}`)).text();
    check('order page without the key hides the order', noKey.includes('couldn’t find that order') && !noKey.includes('Lake View'));
  });

  await test.step('online payment: cancel, then pay', async () => {
    await addStickers(p, 2);
    await nav(p, '/checkout');
    await fillCheckout(p, { email: guest });
    await p.waitForSelector('dt:has-text("Online payment discount")', { timeout: 10000 });
    await p.locator('main form button[type=submit]').click();
    await p.waitForSelector('dialog[open] >> text=Test payment', { timeout: 15000 });
    await p.click('dialog[open] button[aria-label="Close the payment window"]');
    await p.waitForSelector('text=Payment cancelled', { timeout: 10000 });
    check('cancelling keeps the order and offers to pay again', (await p.locator('button:has-text("Pay ₹")').count()) >= 1);
    await p.click('button:has-text(" for PYV-")');
    await p.waitForSelector('dialog[open] >> text=Test payment', { timeout: 15000 });
    await p.click('dialog[open] button:has-text("Pay ₹")');
    await p.waitForURL(/\/order\/PYV-[A-Z0-9]{6}\?key=.*placed=1/, { timeout: 20000 });
    const paidNumber = orderNumberIn(p.url());
    await p.waitForSelector('main h1:has-text("Your order is in")', { timeout: 20000 });
    const pageText = await p.locator('main').innerText();
    check('paid order shows as placed and paid', /Paid/.test(pageText) && /PLACED/i.test(pageText), paidNumber);
    check('online discount applied', /Online payment discount/.test(pageText));
    const { rows } = await db.execute({ sql: "select count(*) n from orders where email = ? and payment_method = 'online'", args: [guest] });
    check('only one online order was created', Number(rows[0].n) === 1, `${rows[0].n}`);
  });

  await test.step('custom sticker: online only, upload linked to the order', async () => {
    await p.evaluate(() => localStorage.removeItem('pyv-studio'));
    await nav(p, '/custom/stickers');
    await p.setInputFiles('input[type=file]', `${IMG}/logo-transparent.png`);
    await p.waitForSelector('p[role=status]:has-text("Sharp at")', { timeout: 30000 });
    await p.click('button:has-text("Add to cart")');
    await p.keyboard.press('Escape');
    await nav(p, '/checkout');
    await fillCheckout(p, { email: guest });
    await p.waitForSelector('text=Custom prints are made just for you', { timeout: 10000 });
    check('COD is off for custom items, with the reason', await p.locator('input[name=payment][value=cod]').isDisabled());
    await p.locator('main form button[type=submit]').click();
    await p.waitForSelector('dialog[open] >> text=Test payment', { timeout: 15000 });
    await p.click('dialog[open] button:has-text("Pay ₹")');
    await p.waitForURL(/\/order\/PYV-/, { timeout: 20000 });
    const customNumber = orderNumberIn(p.url());
    const { rows } = await db.execute({ sql: 'select count(*) n from uploads u join orders o on o.id = u.order_id where o.number = ?', args: [customNumber] });
    check('the upload is linked to the order', Number(rows[0].n) === 1, customNumber);
    const { rows: items } = await db.execute({ sql: 'select custom from order_items i join orders o on o.id = i.order_id where o.number = ? and i.custom is not null', args: [customNumber] });
    check('the order keeps the full design', Boolean(items[0] && JSON.parse(String(items[0].custom)).items[0].upload.name === 'logo-transparent.png'));
  });

  await test.step('sign in with an email code; orders and addresses', async () => {
    await nav(p, '/account');
    await p.fill('#signin-email', guest.toUpperCase());
    const before = mails(guest).length;
    await p.click('button:has-text("Email me a code")');
    await p.waitForSelector('#signin-code', { timeout: 10000 });
    const codeMail = await waitFor(() => mails(guest).slice(before).find((m) => /sign-in code/.test(m.subject)));
    const otp = codeMail?.subject.match(/(\d{6})/)?.[1];
    check('sign-in code emailed', Boolean(otp));
    await p.fill('#signin-code', '000000');
    await p.click('button:has-text("Sign in")');
    await p.waitForSelector('text=code isn’t right', { timeout: 10000 }).catch(() => {});
    check('a wrong code is refused', (await p.locator('text=code isn’t right').count()) === 1);
    await p.fill('#signin-code', otp ?? '');
    await p.click('button:has-text("Sign in")');
    await p.waitForSelector('text=Signed in as', { timeout: 15000 });
    const orderRows = await p.locator('section[aria-labelledby="orders-title"] li').count();
    check('earlier guest orders show in the account', orderRows >= 2, `${orderRows} orders`);
    await p.click('button:has-text("Add an address")');
    await p.fill('#book-name', 'Asha Rao');
    await p.fill('#book-line1', '4th Floor, Neon Towers');
    await p.fill('#book-pincode', '400001');
    await p.fill('#book-city', 'Mumbai');
    await p.selectOption('#book-state', 'Maharashtra');
    await p.fill('#book-phone', '9811122233');
    await p.click('button:has-text("Save address")');
    await p.waitForSelector('text=Neon Towers', { timeout: 10000 });
    check('address saved as the default', (await p.locator('li:has-text("Neon Towers") >> text=Default').count()) === 1);
    await addStickers(p, 1);
    await nav(p, '/checkout');
    await p.waitForSelector('text=Your saved addresses', { timeout: 10000 });
    check('checkout prefills the saved address', (await p.inputValue('#addr-line1')) === '4th Floor, Neon Towers' && (await p.inputValue('#contact-email')) === guest);
    await nav(p, '/account');
    await p.click('button:has-text("Sign out")');
    await p.waitForSelector('#signin-email', { timeout: 10000 });
  });

  await test.step('phone layouts', async () => {
    const ph = await browser.newContext({ ...devices['iPhone 13'] });
    const m = await ph.newPage();
    watchErrors(m, errors, 'phone');
    await nav(m, '/c/laptop-stickers');
    await m.getByRole('button', { name: /^Add .* to cart$/ }).first().click();
    for (const path of ['/checkout', '/account', '/track', codUrl.replace(B, '')]) {
      await nav(m, path);
      const over = await sidewaysScroll(m);
      check(`no sideways scroll on phone ${path.split('?')[0]}`, over <= 0, `${over}px`);
    }
    await ph.close();
  });

  await ctx.close();
  expect(errors, 'no script errors in the browser').toEqual([]);
});
