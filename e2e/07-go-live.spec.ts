import { devices, expect, test } from '@playwright/test';
import { serverEnv } from './env';
import { B, check, clearRateLimits, nav, OWNER, sidewaysScroll, signIn, watchErrors } from './support';

/** The dashboard's "Before you go live" list, and the business details that fill in the policy pages. */
test('go-live checklist and policy pages', async ({ browser }) => {
  await clearRateLimits();
  const errors: string[] = [];
  const health = await (await fetch(`${B}/api/health`)).json();
  check('health route answers', health.ok === true && health.database && health.uploads, JSON.stringify(health));

  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const a = await ctx.newPage();
  watchErrors(a, errors, 'admin');
  await signIn(a, OWNER, '/admin');
  await a.waitForSelector('h2:has-text("Before you go live")');
  const before = (await a.locator('section[aria-labelledby="golive-title"]').textContent()) ?? '';
  check('dashboard lists what’s missing before launch', /\d+ of \d+ done/.test(before) && before.includes('Grievance officer named') && before.includes('Store address uses https'), before.match(/\d+ of \d+ done/)?.[0]);
  check('email and off-server backups wait under "Later"', before.includes('Later: the store works without these') && before.includes('Emails (Resend)') && before.includes('Backups off the server'));
  check('it never shows secret values', !before.includes(serverEnv.BETTER_AUTH_SECRET));

  await test.step('fill in the business details', async () => {
    await nav(a, '/admin/settings');
    await a.fill('#st-business-grievanceName', 'Asha Rao');
    await a.fill('#st-business-grievanceDesignation', 'Founder');
    await a.fill('#st-business-city', 'Bengaluru');
    await a.fill('#st-business-policiesUpdated', '2026-11-01');
    await a.fill('#st-aboutStory', 'We started PrintYourVibe in a Bengaluru flat.\n\nNow we print for fans across India.');
    await a.click('button:has-text("Save settings")');
    await a.waitForSelector('text=Saved. The store uses the new settings now.');
    const page = async (slug: string) => (await (await a.request.get(`${B}/pages/${slug}`)).text()).replace(/<[^>]+>/g, ' ');
    check('contact page names the grievance officer', (await page('contact')).includes('Asha Rao, Founder'));
    check('about page shows the story', (await page('about')).includes('Now we print for fans across India.'));
    const terms = await page('terms');
    check('terms show the city and the review date', terms.includes('Courts in Bengaluru') && terms.includes('Last updated: 1 Nov 2026'));
    await nav(a, '/admin');
    const after = (await a.locator('section[aria-labelledby="golive-title"] li', { hasText: 'Grievance officer named' }).textContent()) ?? '';
    check('the checklist ticks the grievance officer', after.includes('Done:') && after.includes('Asha Rao, Founder'), after.trim());
  });

  await test.step('phone layout', async () => {
    const phone = await browser.newContext({ ...devices['iPhone 13'] });
    await phone.addCookies(await ctx.cookies());
    const p = await phone.newPage();
    await nav(p, '/admin');
    await p.waitForSelector('h2:has-text("Before you go live")');
    const wide = await sidewaysScroll(p);
    check('phone: dashboard checklist fits', wide <= 0, `+${wide}px`);
    await phone.close();
  });

  await test.step('put the settings back', async () => {
    await nav(a, '/admin/settings');
    for (const id of ['#st-business-grievanceName', '#st-business-grievanceDesignation', '#st-business-city', '#st-business-policiesUpdated', '#st-aboutStory']) await a.fill(id, '');
    await a.click('button:has-text("Save settings")');
    await a.waitForSelector('text=Saved. The store uses the new settings now.');
  });

  await ctx.close();
  expect(errors, 'no script errors in the browser').toEqual([]);
});
