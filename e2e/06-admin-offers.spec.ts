import { devices, expect, test, type Page } from '@playwright/test';
import { B, check, clearRateLimits, IMG, mails, nav, one, orderNumberIn, OWNER, runTag, sidewaysScroll, signIn, waitFor, watchErrors } from './support';

async function fillCart(p: Page, n = 3) {
  await nav(p, '/c/wall-posters');
  for (let i = 0; i < n; i++) {
    await p.getByRole('button', { name: /^Add .* to cart$/ }).nth(i).click();
    await p.keyboard.press('Escape');
  }
}
async function checkoutDetails(p: Page, email: string) {
  await nav(p, '/checkout');
  await p.fill('#contact-email', email);
  await p.fill('#contact-phone', '98765 43210');
  await p.fill('#addr-name', 'Kavya Menon');
  await p.fill('#addr-line1', '12, Lake View Road');
  await p.fill('#addr-pincode', '682001');
  await p.fill('#addr-city', 'Kochi');
  await p.selectOption('#addr-state', 'Kerala');
}
async function applyCoupon(p: Page, code: string) {
  if (await p.locator('button:has-text("Have a coupon?")').count()) await p.click('button:has-text("Have a coupon?")');
  await p.fill('#coupon-code', code);
  await p.click('button:has-text("Apply")');
  await p.locator('#coupon-code-error').or(p.getByText(`${code.toUpperCase()} applied`)).first().waitFor({ timeout: 15000 });
}
const usedCount = async (code: string) => Number((await one('select used_count from coupons where code = ?', [code]))!.used_count);

/** Coupons at checkout, store settings, the home banner, verified-buyer reviews and the customer list. */
test('admin: coupons, settings, home banner, reviews and customers', async ({ browser }) => {
  await clearRateLimits();
  const tag = runTag();
  const errors: string[] = [];
  const admin = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const a = await admin.newPage();
  watchErrors(a, errors, 'admin');
  const shopper = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const s = await shopper.newPage();
  watchErrors(s, errors, 'shopper');

  const W = `WELCOME${tag}`;
  const F = `FREESHIP${tag}`;
  const BIG = `BIG${tag}`;
  const OLD = `OLD${tag}`;
  const email = `kavya.${tag}@example.com`;
  let number = '';
  let orderUrl = '';

  await test.step('create four coupons', async () => {
    await signIn(a, OWNER, '/admin/coupons');
    await a.waitForSelector('h1:has-text("Coupons")');
    const makeCoupon = async (c: { code: string; kind: string; value?: string; max?: string; min?: string; ends?: string; per?: string }) => {
      await nav(a, '/admin/coupons/new');
      await a.fill('#cp-code', c.code);
      await a.click(`label:has-text("${c.kind}")`);
      if (c.value) await a.fill('#cp-value', c.value);
      if (c.max) await a.fill('#cp-maxDiscount', c.max);
      await a.fill('#cp-minOrder', c.min ?? '');
      if (c.ends) await a.fill('#cp-endsOn', c.ends);
      await a.fill('#cp-perCustomer', c.per ?? '');
      await a.click('button:has-text("Create coupon")');
      await a.waitForURL(/\/admin\/coupons\?saved=1/, { timeout: 15000 });
    };
    await makeCoupon({ code: W, kind: 'Percent off', value: '10', max: '200', min: '199', per: '1' });
    await makeCoupon({ code: F, kind: 'Free shipping', min: '' });
    await makeCoupon({ code: BIG, kind: 'Amount off', value: '100', min: '999' });
    await makeCoupon({ code: OLD, kind: 'Percent off', value: '20', ends: '2025-12-31' });
    const list = (await a.locator('table').textContent()) ?? '';
    check('coupons list shows offers and states', list.includes(W) && list.includes('10% off (up to ₹200)') && list.includes('Free shipping') && /Expired/.test(list) && /Live/.test(list));
  });

  await test.step('a shopper uses a coupon with Cash on Delivery', async () => {
    await fillCart(s, 3);
    await checkoutDetails(s, email);
    await applyCoupon(s, OLD);
    check('an expired code says when it expired', ((await s.locator('#coupon-code-error').textContent()) ?? '').includes('expired on 31 Dec 2025'));
    await applyCoupon(s, BIG);
    const short = (await s.locator('#coupon-code-error').textContent()) ?? '';
    check('a code with a minimum order says how much more to add', /Add ₹\d+ more to use/.test(short), short);
    await applyCoupon(s, W.toLowerCase());
    check('a good code applies, and lowercase is fine', (await s.locator(`text=${W} applied`).count()) === 1);
    await s.locator('label:has-text("Cash on Delivery")').click();
    await s.waitForSelector('dt:has-text("Cash on Delivery fee")');
    const summary = (await s.locator('aside[aria-label="Order summary"] dl').textContent()) ?? '';
    check('the coupon is its own line in the summary', new RegExp(`Coupon ${W}−₹\\d+`).test(summary), summary.replace(/\s+/g, ' ').slice(0, 160));
    await s.locator('main form button[type=submit]').click();
    await s.waitForURL(/\/order\/PYV-/, { timeout: 20000 });
    orderUrl = s.url();
    number = orderNumberIn(orderUrl);
    const ord = (await one('select coupon_code, discounts, total from orders where number = ?', [number]))!;
    const coupon = (JSON.parse(String(ord.discounts)) as { id: string; amount: number }[]).find((d) => d.id === 'coupon');
    check('the order keeps the code and discount', ord.coupon_code === W && Boolean(coupon && coupon.amount > 0), `${ord.coupon_code} ${ord.discounts}`);
    check('a COD order uses the code straight away', (await usedCount(W)) === 1);
  });

  await test.step('one use per shopper; free shipping on an online order', async () => {
    await fillCart(s, 1);
    await checkoutDetails(s, email);
    await applyCoupon(s, W);
    check('one use per shopper', ((await s.locator('#coupon-code-error').textContent()) ?? '').includes('already used'));
    await applyCoupon(s, F);
    check('free shipping shows on the shipping line', (await s.locator('dd:has-text("Free with")').count()) === 1);
    await s.locator('main form button[type=submit]').click();
    await s.waitForSelector('dialog[open] >> text=Test payment');
    check('an online order hasn’t used the code before payment', (await usedCount(F)) === 0);
    await s.click('dialog[open] button:has-text("Pay ₹")');
    await s.waitForURL(/\/order\/PYV-/, { timeout: 20000 });
    check('paying uses the code', (await usedCount(F)) === 1);
    const paid = (await one('select shipping, coupon_code from orders where number = ?', [orderNumberIn(s.url())]))!;
    check('the paid order shipped free', paid.shipping === 0 && paid.coupon_code === F);
  });

  await test.step('settings: free-shipping amount, announcement and WhatsApp', async () => {
    await nav(a, '/admin/settings');
    const freeBefore = await a.inputValue('#st-shipping-freeAbove');
    const annBefore = await a.inputValue('#st-announcement');
    await a.fill('#st-shipping-freeAbove', '599');
    await a.fill('#st-announcement', `Diwali sale ${tag}\nFree shipping above ₹599`);
    await a.fill('#st-contact-whatsapp', '12345');
    await a.click('button:has-text("Save settings")');
    await a.waitForSelector('#st-contact-whatsapp[aria-invalid="true"]');
    check('settings point at a wrong field', (await a.locator('#st-contact-whatsapp-error').textContent()) === 'Enter a 10-digit Indian mobile number.');
    await a.fill('#st-contact-whatsapp', '98765 43210');
    await a.click('button:has-text("Save settings")');
    await a.waitForSelector('text=Saved. The store uses the new settings now.');
    await nav(s, '/');
    check('the announcement bar shows the new message', (await s.getByText(`Diwali sale ${tag}`).count()) > 0);
    const product = (await one("select id, price_from from products where type_id = 'wall-posters' and is_active = 1 and price_override is null limit 1"))!;
    const q = await s.request.post(`${B}/api/cart/quote`, { data: { lines: [{ key: 'x', productId: Number(product.id), qty: 3 }] } });
    const hints = ((await q.json()).summary.hints as { text: string }[]).map((h) => h.text).join(' | ');
    const short = (59900 - 3 * Number(product.price_from)) / 100;
    check('the cart uses the new free-shipping amount', hints.includes(`₹${short} more for free shipping`), hints);
    check('the WhatsApp number is stored in full', (await one("select json_extract(value, '$.contact.whatsapp') as w from settings where key = 'store'"))!.w === '+91 98765 43210');
    await nav(a, '/admin/settings');
    await a.fill('#st-shipping-freeAbove', freeBefore);
    await a.fill('#st-announcement', annBefore);
    await a.fill('#st-contact-whatsapp', '');
    await a.click('button:has-text("Save settings")');
    await a.waitForSelector('text=Saved. The store uses the new settings now.');
  });

  await test.step('home page banner', async () => {
    await nav(a, '/admin/content');
    const titleBefore = await a.inputValue('#hm-title');
    await a.fill('#hm-title', `Festive drop ${tag}`);
    await a.setInputFiles('input[type=file]', `${IMG}/logo-transparent.png`);
    await a.waitForSelector('section[aria-label="Preview"] img', { timeout: 30000 });
    await a.click('button:has-text("Save")');
    await a.waitForSelector('text=See the home page');
    await nav(s, '/');
    check('the home page shows the new banner title', ((await s.locator('h1').first().textContent()) ?? '').includes(`Festive drop ${tag}`));
    check('the home page shows the banner photo', ((await s.locator('main section').first().locator('img').getAttribute('src')) ?? '').startsWith('/api/uploads/'));
    await nav(a, '/admin/content');
    await a.fill('#hm-title', titleBefore);
    await a.click('button:has-text("Remove photo")');
    await a.click('button:has-text("Save")');
    await a.waitForSelector('text=See the home page');
  });

  await test.step('reviews: deliver the order, review an item with a photo, approve it', async () => {
    await nav(a, `/admin/orders/${number}`);
    await a.click('button:has-text("Mark confirmed")');
    await a.waitForSelector('button:has-text("Start printing")');
    await a.click('button:has-text("Start printing")');
    await a.waitForSelector('button:has-text("Mark shipped")');
    await a.click('button:has-text("Mark shipped")');
    await a.selectOption('#ship-courier', 'Delhivery');
    await a.fill('#ship-awb', `DLV${tag}`);
    await a.click('button:has-text("Save and email the customer")');
    await a.waitForSelector('button:has-text("Mark delivered")');
    await a.click('button:has-text("Mark delivered")');
    await waitFor(async () => (await one('select status from orders where number = ?', [number]))!.status === 'delivered');
    const delivered = await waitFor(() => mails(email).find((m) => m.subject.includes(`${number} was delivered`)));
    check('the delivered email links to the review form', Boolean(delivered?.text.includes('#reviews')));
    await nav(s, orderUrl.replace('&placed=1', ''));
    await s.waitForSelector('#reviews-title');
    const items = s.locator('#reviews li');
    check('each catalog item can be reviewed', (await items.count()) === 3);
    const first = items.first();
    const slug = ((await first.locator('a').first().getAttribute('href')) ?? '').replace('/p/', '');
    await first.locator('button:has-text("Write a review")').click();
    await first.locator('button:has-text("Send review")').click();
    check('a review needs stars', (await first.locator('text=Choose from 1 to 5 stars.').count()) === 1);
    await first.locator('label:has(input[value="5"])').click();
    await first.locator('textarea').fill(`Crisp print and thick paper. Looks great on my wall. ${tag}`);
    await first.locator('input[type=file]').setInputFiles(`${IMG}/photo-04.jpg`);
    await first.locator('img[alt="Photo 1"]').waitFor({ timeout: 30000 });
    await first.locator('button:has-text("Send review")').click();
    await first.locator('text=Your review appears on the product page after a quick check').waitFor();
    const rv = await one('select id, status, name, photos from reviews where order_id = (select id from orders where number = ?)', [number]);
    check('the review waits for approval, with a short name and the photo', rv?.status === 'pending' && rv.name === 'Kavya M.' && JSON.parse(String(rv.photos)).length === 1);
    check('its photo is kept as a review photo', (await one('select kind from uploads where id = ?', [JSON.parse(String(rv!.photos))[0]]))!.kind === 'review');
    check('a pending review isn’t on the product page', !(await (await s.request.get(`${B}/p/${slug}`)).text()).includes(`Looks great on my wall. ${tag}`));
    await nav(a, '/admin');
    check('the dashboard counts reviews to approve', /Reviews waiting for approval\s*[1-9]/.test((await a.locator('main').textContent()) ?? ''));
    await nav(a, '/admin/reviews');
    await a.locator('li', { hasText: `Looks great on my wall. ${tag}` }).locator('button:has-text("Approve")').click();
    await waitFor(async () => (await one('select status from reviews where id = ?', [rv!.id]))!.status === 'approved');
    await nav(s, `/p/${slug}`);
    check('the approved review is on the product page', (await s.locator(`#reviews >> text=Looks great on my wall. ${tag}`).count()) === 1);
    check('it says verified buyer', (await s.locator('#reviews >> text=Verified buyer').count()) > 0);
    check('the average shows by the title', (await s.locator('a[href="#reviews"]').count()) === 1);
    const ld = JSON.parse((await s.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}');
    check('search data has the rating', ld.aggregateRating?.reviewCount >= 1 && Number(ld.aggregateRating.ratingValue) > 0, JSON.stringify(ld.aggregateRating));
    await nav(s, orderUrl.replace('&placed=1', ''));
    check('the order page says the review is live', (await s.locator('text=Your review is on the product page').count()) === 1);
  });

  await test.step('customers and order search', async () => {
    await nav(a, `/admin/customers?q=${encodeURIComponent(email)}`);
    const cells = await a.locator('tbody tr').first().locator('td').allTextContents();
    const spent = (await one('select sum(total) t from orders where email = ?', [email]))!.t;
    check('the customer list groups orders by email', cells[0].includes('Kavya Menon') && cells[1] === '2' && cells[2] === `₹${Number(spent) / 100}`, cells.join(' | '));
    await nav(a, `/admin/orders?q=${W}`);
    check('orders can be found by coupon code', (await a.locator(`a:has-text("${number}")`).count()) === 1);
  });

  await test.step('switch a coupon off, delete unused ones', async () => {
    await nav(a, '/admin/coupons');
    await a.click(`button[aria-label="${BIG} on"]`);
    await waitFor(async () => (await one('select is_active from coupons where code = ?', [BIG]))!.is_active === 0);
    for (const code of [BIG, OLD]) {
      const c = (await one('select id from coupons where code = ?', [code]))!;
      await nav(a, `/admin/coupons/${c.id}`);
      a.once('dialog', (d) => d.accept());
      await a.click('button:has-text("Delete")');
      await a.waitForURL(/\/admin\/coupons$/);
    }
    check('unused coupons can be deleted', !(await one('select id from coupons where code in (?, ?)', [BIG, OLD])));
    const used = (await one('select id from coupons where code = ?', [W]))!;
    await nav(a, `/admin/coupons/${used.id}`);
    check('a used coupon can’t be deleted', (await a.locator('button:has-text("Delete")').count()) === 0);
  });

  await test.step('phone layouts', async () => {
    const phone = await browser.newContext({ ...devices['iPhone 13'] });
    await phone.addCookies(await admin.cookies());
    const pp = await phone.newPage();
    for (const path of ['/admin/coupons', '/admin/coupons/new', '/admin/settings', '/admin/content', '/admin/reviews?tab=approved', '/admin/customers', '/admin']) {
      await nav(pp, path);
      await pp.waitForSelector('h1');
      const wide = await sidewaysScroll(pp);
      check(`phone: no sideways scroll on ${path}`, wide <= 0, `+${wide}px`);
    }
    const shopPhone = await browser.newContext({ ...devices['iPhone 13'] });
    const sp = await shopPhone.newPage();
    await fillCart(sp, 2);
    await checkoutDetails(sp, `phone.${tag}@example.com`);
    await applyCoupon(sp, F);
    const wide = await sidewaysScroll(sp);
    check('phone: checkout with a coupon fits', wide <= 0, `+${wide}px`);
    await phone.close();
    await shopPhone.close();
  });

  await admin.close();
  await shopper.close();
  expect(errors, 'no script errors in the browser').toEqual([]);
});
