import { devices, expect, test, type Page } from '@playwright/test';
import { all, B, check, clearRateLimits, IMG, nav, one, OWNER, runTag, sidewaysScroll, signIn, waitFor, watchErrors } from './support';

const status = async (page: Page, path: string) => (await page.request.get(`${B}${path}`, { maxRedirects: 0 })).status();
/** A missing category or vibe is a 404, or (if it streamed) the not-found page with noindex. */
const gone = async (page: Page, path: string) => {
  const r = await page.request.get(`${B}${path}`, { maxRedirects: 0 });
  return r.status() === 404 || /<meta name="robots" content="noindex"/.test(await r.text());
};
const pdpPrice = async (page: Page, slug: string) => {
  await nav(page, `/p/${slug}`);
  return (await page.locator('main .font-display.text-lime:visible').first().textContent())?.trim() ?? '';
};
const rupees = (s: string) => Number(s.replace(/[^\d]/g, ''));

/** Products, photos, CSV import, price tables, hiding categories, and vibes. */
test('admin: products, CSV import, categories and vibes', async ({ browser }) => {
  await clearRateLimits();
  const tag = runTag();
  const errors: string[] = [];
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  watchErrors(page, errors, 'admin');
  const store = await ctx.newPage();

  await test.step('admin APIs refuse visitors', async () => {
    const anon = await browser.newContext();
    const ar = anon.request;
    check('photo upload refuses visitors', (await ar.post(`${B}/api/admin/uploads`, { data: { name: 'a.jpg', type: 'image/jpeg', size: 10 } })).status() === 403);
    check('export refuses visitors', (await ar.get(`${B}/api/admin/products/export`)).status() === 403);
    check('import refuses visitors', (await ar.post(`${B}/api/admin/products/import?mode=check`, { data: 'name\nx' })).status() === 403);
    await anon.close();
  });

  const demo = (await one("select name, slug from products where is_sample = 1 and type_id = 'wall-posters' and price_override is null order by popularity desc limit 1"))!;
  const name = `Test Poster ${tag}`;
  let id = 0;
  let slug = '';
  let photos: string[] = [];

  await test.step('sign in and find a product', async () => {
    await signIn(page, OWNER, '/admin/products');
    await page.waitForSelector('h1:has-text("Products")');
    const counts = (await page.locator('main p:has-text("shown in the store")').textContent()) ?? '';
    check('product list shows counts', /products · .* shown in the store/.test(counts), counts.trim());
    await nav(page, `/admin/products?q=${encodeURIComponent(demo.name)}&type=wall-posters`);
    check('search and type filter find a product', (await page.locator(`table a:has-text("${demo.name}")`).count()) > 0);
  });

  await test.step('add a product with two photos and its own price', async () => {
    await nav(page, '/admin/products/new');
    await page.fill('#pf-name', name);
    await page.selectOption('#pf-typeId', 'wall-posters');
    await page.selectOption('#pf-vibeId', 'anime');
    await page.locator('fieldset button[aria-pressed]', { hasText: 'Aesthetic' }).click();
    await page.fill('#pf-description', 'A test poster for the admin check.');
    await page.fill('#pf-tags', `testposter${tag}, admin`);
    await page.setInputFiles('input[type=file]', [`${IMG}/photo-01.jpg`, `${IMG}/photo-02.jpg`]);
    await page.waitForSelector('img[alt="Photo 2"]', { timeout: 30000 });
    const firstBefore = await page.locator('img[alt="Photo 1"]').getAttribute('src');
    await page.click('button[aria-label="Move photo 2 earlier"]');
    const firstAfter = (await page.locator('img[alt="Photo 1"]').getAttribute('src')) ?? '';
    check('photos upload and reorder', firstBefore !== firstAfter);
    await page.fill('#pf-startingPrice', '249');
    check('card preview shows the price', ((await page.locator('aside[aria-label="Card preview"]').textContent()) ?? '').includes('₹249'));
    await page.click('button[type=submit]:has-text("Add product")');
    await page.waitForURL(/\/admin\/products\/\d+\?saved=1/, { timeout: 20000 });
    id = Number(page.url().match(/products\/(\d+)/)![1]);
    const row = (await one('select slug, price_from, images, vibe_id, is_sample from products where id = ?', [id]))!;
    slug = String(row.slug);
    const vibes = (await all('select vibe_id from product_vibes where product_id = ? order by vibe_id', [id])).map((r) => r.vibe_id);
    check('product saved with slug, price and vibes', slug === `test-poster-${tag}-wall-poster` && row.price_from === 24900 && vibes.join() === 'aesthetic,anime', `${slug} ${row.price_from} ${vibes}`);
    photos = JSON.parse(String(row.images));
    check('photos saved in the new order', photos.length === 2 && photos[0] === firstAfter.replace('?size=thumb', ''), photos.join(' '));
    const kinds = (await all(`select kind from uploads where id in (${photos.map(() => '?').join(',')})`, photos.map((p) => p.split('/').pop()!))).map((r) => r.kind);
    check('photos are product uploads', kinds.every((k) => k === 'product'), kinds.join());
  });

  await test.step('it shows in the store', async () => {
    check('product page shows the price', (await pdpPrice(store, slug)) === '₹249');
    const galleryMain = await store.locator('main img[alt^="Test Poster"]:visible').first().getAttribute('src');
    check('product page uses the full-size photo', galleryMain === photos[0], galleryMain ?? '');
    check('product page has photo thumbnails', (await store.locator('[aria-label="Product photos"] button').count()) === 2);
    await store.click('[aria-label="Product photos"] button >> nth=1');
    check('choosing a thumbnail changes the photo', (await store.locator('main img[alt$="photo 2 of 2"]:visible').count()) === 1);
    const ld = JSON.parse((await store.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}');
    check('structured data lists the photos', Array.isArray(ld.image) && ld.image[0] === `${B}${photos[0]}`);
    const photoRes = await store.request.get(`${B}${photos[0]}`);
    check('product photos are publicly cacheable', /^public, max-age=31536000, immutable$/.test(photoRes.headers()['cache-control'] ?? ''));
    await nav(store, `/search?q=testposter${tag}`);
    const card = store.locator(`article:has-text("${name}") img`).first();
    check('search finds it, with the small photo on the card', (await card.getAttribute('src'))?.endsWith('?size=thumb'));
  });

  await test.step('hide it, then show and move it in bulk', async () => {
    await nav(page, `/admin/products/${id}`);
    await page.locator('label:has-text("Show in the store") input').uncheck();
    await page.click('button[type=submit]:has-text("Save changes")');
    await page.waitForSelector('text=Saved. The store shows the change now.');
    check('hidden product page is not found', (await status(store, `/p/${slug}`)) === 404);
    await nav(page, `/admin/products?q=${tag}`);
    await page.check('input[aria-label="Select all on this page"]');
    await page.click('button:has-text("Show") >> nth=0');
    await page.waitForSelector('text=Shown: 1.');
    check('bulk show puts it back', (await status(store, `/p/${slug}`)) === 200);
    await page.check(`input[aria-label="Select ${name}"]`);
    await page.selectOption('select[aria-label="Move to vibe"]', 'f1-motorsport');
    await page.click('button:has-text("Move")');
    await page.waitForSelector('text=Moved: 1.');
    const moved = (await one('select vibe_id from products where id = ?', [id]))!;
    const movedLinks = (await all('select vibe_id from product_vibes where product_id = ? order by vibe_id', [id])).map((r) => r.vibe_id);
    check('bulk set vibe replaces the main vibe', moved.vibe_id === 'f1-motorsport' && movedLinks.join() === 'aesthetic,f1-motorsport', movedLinks.join());
  });

  await test.step('CSV: upload a photo, export, edit, add, check and import', async () => {
    await nav(page, '/admin/products/import');
    await page.setInputFiles('input[type=file][multiple]', [`${IMG}/photo-03.jpg`]);
    await page.waitForSelector('text=1 photo uploaded', { timeout: 30000 });
    const exp = await page.request.get(`${B}/api/admin/products/export?real=1`);
    check('export downloads a CSV', exp.status() === 200 && /attachment; filename="printyourvibe-products-/.test(exp.headers()['content-disposition'] ?? ''));
    const csv = (await exp.text()).replace(/^﻿/, '');
    const lines = csv.trim().split('\r\n');
    const ours = lines.find((l) => l.startsWith(`${id},`));
    check('export includes the new product', Boolean(ours), ours);
    const cells = (ours ?? '').split(',');
    cells[4] = 'aesthetic;anime';
    cells[7] = '299';
    const newName = `CSV Poster ${tag}`;
    const body = [lines[0], cells.join(','), `,,${newName},wall-posters,anime,,csv,199,,photo-03.jpg,yes`, `,,Broken ${tag},mugs,anime,,,,,,yes`].join('\n');
    await page.fill('#csv-text', body);
    await page.click('button:has-text("Check file")');
    await page.waitForSelector('text=New 1');
    const chips = await page.locator('span.chip').allTextContents();
    check('check shows 1 new, 1 update, 1 error', chips.includes('New 1') && chips.includes('Updates 1') && chips.includes('Errors 1'), chips.join(' | '));
    check('the error row says why', (await page.locator('td:has-text("Unknown type “mugs”")').count()) === 1);
    check('the update row lists its changes', (await page.locator('td:has-text("Changes vibes, price")').count()) === 1);
    await page.click('button:has-text("Import 2 products")');
    await page.waitForSelector('text=Added 1 and updated 1');
    check('updated product shows the new price', (await pdpPrice(store, slug)) === '₹299');
    const created = await one('select id, slug, images, price_from from products where name = ?', [newName]);
    check('new product has its matched photo', created && JSON.parse(String(created.images)).length === 1 && created.price_from === 19900);
    check('new product is in the store', created && (await status(store, `/p/${created.slug}`)) === 200);
    await page.click('button:has-text("Check file")');
    await page.waitForSelector('text=Unchanged 2');
    check('checking the same file again finds nothing to change', await page.locator('button:has-text("Import 0 products")').isDisabled());
    const tpl = await page.request.get(`${B}/api/admin/products/template`);
    check('template downloads with the columns', (await tpl.text()).includes('id,slug,name,type,vibes,description,tags,price_from_rupees,popularity,images,active'));
  });

  await test.step('price table: change wall posters, see a demo product follow, put it back', async () => {
    const before = await pdpPrice(store, String(demo.slug));
    await nav(page, '/admin/categories/wall-posters');
    const base = await page.inputValue('#cf-base');
    await page.fill('#cf-base', String(Number(base) + 10));
    await page.selectOption('select >> nth=0', { index: 1 });
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('text=Saved.');
    const after = await pdpPrice(store, String(demo.slug));
    check('price table change reaches the product page', rupees(after) === rupees(before) + 10, `${before} → ${after}`);
    const pf = (await one('select price_from from products where slug = ?', [demo.slug]))!;
    check('starting price is recomputed', pf.price_from === (Number(base) + 10) * 100, String(pf.price_from));
    const ownPrice = (await one('select price_from from products where id = ?', [id]))!;
    check('a product with its own price keeps it', ownPrice.price_from === 29900, String(ownPrice.price_from));
    await page.fill('#cf-base', base);
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('text=Saved.');
    await page.fill('#cf-base', '0');
    check('a price below ₹1 is refused', await page.locator('button:has-text("Save changes")').isDisabled());
    await page.fill('#cf-base', base);
  });

  await test.step('hide a whole category, then show it again', async () => {
    check('a shown category is indexable', !(await gone(store, '/c/bookmarks')));
    await nav(page, '/admin/categories/bookmarks');
    await page.locator('label:has-text("Show in the store") input').uncheck();
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('text=Saved.');
    const bm = (await one("select slug from products where type_id = 'bookmarks' and is_active = 1 limit 1"))!;
    check('hidden type: category page is not found', await gone(store, '/c/bookmarks'));
    check('hidden type: its products are not found (404)', (await status(store, `/p/${bm.slug}`)) === 404);
    await nav(store, '/search?q=bookmark');
    check(
      'hidden type: its products leave search',
      (await store.locator('main article:visible').count()) === 0 || !((await store.locator('main article:visible').first().textContent()) ?? '').includes('Bookmark'),
    );
    await page.locator('label:has-text("Show in the store") input').check();
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('text=Saved.');
    check('type shown again', !(await gone(store, '/c/bookmarks')) && (await status(store, `/p/${bm.slug}`)) === 200);
  });

  await test.step('vibes: add a featured one, hide it, delete it', async () => {
    await nav(page, '/admin/vibes');
    const vibeName = `Test Vibe ${tag}`;
    await page.fill('#nv-name', vibeName);
    await page.fill('#nv-blurb', 'Only for the admin check.');
    await page.check('text=Feature it on the home page');
    await page.click('button:has-text("Add vibe")');
    await page.waitForSelector(`text=Added ${vibeName}.`);
    await nav(store, '/');
    check('featured vibe is on the home page', (await store.locator(`main a[href="/v/test-vibe-${tag}"]`).count()) > 0);
    await page.locator('li', { hasText: vibeName }).locator('button:has-text("Hide")').click();
    await page.waitForSelector(`li:has-text("${vibeName}") >> text=Hidden`);
    check('hidden vibe page is not found', await gone(store, `/v/test-vibe-${tag}`));
    page.once('dialog', (d) => d.accept());
    await page.locator('li', { hasText: vibeName }).locator('button:has-text("Delete")').click();
    await waitFor(async () => (await page.locator('li', { hasText: vibeName }).count()) === 0);
    check('unused vibe deleted', !(await one('select id from vibes where id = ?', [`test-vibe-${tag}`])));
    check('a vibe in use has no delete button', (await page.locator('li', { hasText: 'Anime' }).first().locator('button:has-text("Delete")').count()) === 0);
  });

  await test.step('phone layouts', async () => {
    const phone = await browser.newContext({ ...devices['iPhone 13'] });
    await phone.addCookies(await ctx.cookies());
    const pp = await phone.newPage();
    for (const path of ['/admin/products', `/admin/products/${id}`, '/admin/products/import', '/admin/categories', '/admin/categories/framed-posters', '/admin/vibes']) {
      await nav(pp, path);
      await pp.waitForSelector('h1');
      const wide = await sidewaysScroll(pp);
      check(`phone: no sideways scroll on ${path}`, wide <= 0, `+${wide}px`);
    }
    await phone.close();
  });

  await test.step('clean up: delete both test products', async () => {
    await nav(page, `/admin/products?q=${tag}`);
    await page.check('input[aria-label="Select all on this page"]');
    page.once('dialog', (d) => d.accept());
    await page.click('button:has-text("Delete")');
    await page.waitForSelector('text=Deleted: 2.');
    check('bulk delete removes them', (await status(store, `/p/${slug}`)) === 404 && !(await one('select id from products where id = ?', [id])));
  });

  await ctx.close();
  expect(errors.filter((e) => !/404|403/.test(e)), 'no script errors in the browser').toEqual([]);
});
