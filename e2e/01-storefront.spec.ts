import { devices, expect, test } from '@playwright/test';
import { B, check, sidewaysScroll } from './support';

/** Browsing as a shopper: cart drawer, menus, search, filters, product options, wishlist, phone layout. */
test('storefront: browse, filter, choose options and save', async ({ browser }) => {
  const errors: string[] = [];
  const open = async (opts: Parameters<typeof browser.newContext>[0]) => {
    const ctx = await browser.newContext(opts);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    p.on('console', (m) => {
      if (m.type() === 'error' || /hydrat/i.test(m.text())) errors.push(`console ${m.type()}: ${m.text().slice(0, 200)}`);
    });
    return { ctx, p };
  };

  await test.step('desktop', async () => {
    const { ctx, p } = await open({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${B}/`, { waitUntil: 'networkidle' });
    check('home renders hero', await p.getByRole('heading', { level: 1 }).first().isVisible());

    // Quick add from the trending grid.
    await p.getByRole('button', { name: /^Add .* to cart$/ }).first().click();
    await p.getByRole('dialog', { name: /Your cart/ }).waitFor();
    await p.waitForFunction(() => /₹/.test(document.querySelector('[role=dialog] dl')?.textContent ?? '') && !document.querySelector('[role=dialog] dl')?.getAttribute('aria-busy')?.includes('true'));
    const total1 = await p.locator('[role=dialog] dl dd').last().textContent();
    check('quick add opens cart drawer with a total', /₹/.test(total1 ?? ''), total1 ?? '');
    await p.getByRole('button', { name: 'Increase quantity' }).first().click();
    await p.waitForTimeout(700);
    const total2 = await p.locator('[role=dialog] dl dd').last().textContent();
    check('changing quantity updates the total', total1 !== total2, `${total1} -> ${total2}`);
    await p.keyboard.press('Escape');
    check('Escape closes the drawer', !(await p.getByRole('dialog', { name: /Your cart/ }).isVisible().catch(() => false)));

    // Mega menu.
    await p.getByRole('button', { name: 'Stickers' }).hover();
    check('Stickers mega menu opens on hover', await p.getByRole('link', { name: /Holographic Stickers/ }).first().isVisible());

    // Search suggestions.
    await p.mouse.move(10, 600);
    await p.getByRole('combobox').fill('pit');
    await p.locator('form[role=search] a[href^="/p/"]').first().waitFor({ timeout: 5000 });
    const sugg = await p.locator('form[role=search] a[href^="/p/"]').count();
    check('search suggestions list products', sugg > 0, `${sugg} products`);
    await p.keyboard.press('Enter');
    await p.waitForURL(/\/search\?q=pit/);
    await p.waitForSelector('article');
    check('Enter opens the search results page', (await p.locator('article').count()) > 0);

    // Listing filters.
    await p.goto(`${B}/c/wall-posters`, { waitUntil: 'networkidle' });
    const before = await p.locator('main p[aria-live="polite"] b').first().textContent();
    await p.locator('aside label', { hasText: 'Sports' }).click();
    await p.waitForURL(/vibe=sports/);
    await p.waitForFunction((b0) => document.querySelector('main p[aria-live="polite"] b')?.textContent !== b0, before);
    const after = await p.locator('main p[aria-live="polite"] b').first().textContent();
    check('vibe filter narrows results', after !== before, `${before} -> ${after}`);
    await p.locator('select').first().selectOption('price-asc');
    await p.waitForURL(/sort=price-asc/);
    check('sort updates the URL', p.url().includes('sort=price-asc'));
    const loadMore = p.getByRole('link', { name: 'Load more' });
    if (await loadMore.isVisible().catch(() => false)) {
      await loadMore.click();
      await p.waitForURL(/page=2/);
      await p.waitForFunction(() => document.querySelectorAll('main article').length > 24);
      check('Load more shows the next page', (await p.locator('main article').count()) > 24);
    }

    // Product page: options change the price and the picture.
    await p.goto(`${B}/p/crimson-tanuki-wall-poster`, { waitUntil: 'networkidle' });
    const price1 = await p.locator('main span.font-display.text-lime:visible').first().textContent();
    await p.getByText('A2', { exact: true }).click();
    await p.getByText('Wood', { exact: true }).click();
    const price2 = await p.locator('main span.font-display.text-lime:visible').first().textContent();
    check('size and frame change the price', price1 !== price2, `${price1} -> ${price2}`);
    await p.getByRole('button', { name: 'On the wall' }).click();
    check('gallery switches to the wall view', (await p.getByRole('img', { name: /On the wall/ }).count()) > 0);
    await p.getByPlaceholder('6-digit pincode').fill('560001');
    await p.getByRole('button', { name: 'Check' }).click();
    check('pincode check gives a delivery window', /Usually delivered/.test((await p.locator('form p[aria-live]').first().textContent()) ?? ''));
    await p.getByRole('button', { name: 'Add to cart' }).click();
    await p.getByRole('dialog', { name: /Your cart/ }).waitFor();
    await p.keyboard.press('Escape');
    await p.getByRole('button', { name: /^Save$/ }).click();
    await p.goto(`${B}/wishlist`, { waitUntil: 'networkidle' });
    await p.waitForSelector('main article', { timeout: 5000 }).catch(() => {});
    check('wishlist shows the saved product', (await p.locator('main article').count()) === 1);
    await p.goto(`${B}/cart`, { waitUntil: 'networkidle' });
    await p.waitForFunction(() => /Total/.test(document.body.textContent ?? ''));
    check('cart page lists lines', (await p.locator('main li').count()) >= 2);

    // A phone skin needs a phone model first.
    await p.goto(`${B}/c/phone-skins`, { waitUntil: 'networkidle' });
    await p.locator('main article h3 a').first().click();
    await p.waitForURL(/\/p\//);
    check('phone skin add is disabled until a model is chosen', await p.getByRole('button', { name: 'Add to cart' }).isDisabled());
    await p.getByLabel('Phone model').selectOption({ index: 1 });
    check('choosing a model enables add to cart', await p.getByRole('button', { name: 'Add to cart' }).isEnabled());
    await ctx.close();
  });

  await test.step('phone', async () => {
    const { ctx, p } = await open({ ...devices['iPhone 13'] });
    await p.goto(`${B}/`, { waitUntil: 'networkidle' });
    check('mobile bottom nav visible', await p.getByRole('navigation', { name: 'Quick links' }).isVisible());
    const overflow = await sidewaysScroll(p);
    check('no sideways scroll on mobile home', overflow <= 0, `overflow ${overflow}px`);
    await p.getByRole('button', { name: 'Open menu' }).click();
    const menu = p.getByRole('dialog', { name: 'Menu' });
    const box = await menu.boundingBox();
    check('the phone menu covers the screen', box !== null && box.height >= 600, JSON.stringify(box));
    await menu.getByRole('button', { name: 'Stickers' }).click();
    check('mobile menu expands a section', await menu.getByRole('link', { name: 'Laptop Stickers' }).isVisible());
    await menu.getByRole('link', { name: 'Laptop Stickers' }).click();
    await p.waitForURL(/\/c\/laptop-stickers/);
    await p.getByRole('button', { name: /Filters/ }).click();
    check('mobile filter sheet opens', await p.getByRole('dialog', { name: 'Filters' }).isVisible());
    const ov2 = await sidewaysScroll(p);
    check('no sideways scroll on mobile listing', ov2 <= 0, `overflow ${ov2}px`);
    await ctx.close();
  });

  expect([...new Set(errors)], 'no script errors in the browser').toEqual([]);
});
