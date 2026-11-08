import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { absoluteUrl, breadcrumbList, ldJson, robotsRules, storeLd } from './seo';

describe('seo helpers', () => {
  it('builds absolute addresses', () => {
    expect(absoluteUrl('https://printyourvibe.in', '/p/neon-koi')).toBe('https://printyourvibe.in/p/neon-koi');
  });
  it('keeps private pages out of search, but not product photos', () => {
    const r = robotsRules('https://printyourvibe.in');
    expect(r.disallow).toEqual(expect.arrayContaining(['/admin', '/checkout', '/api/']));
    expect(r.allow).toContain('/api/uploads/');
  });
  it('blocks everything on a local address', () => {
    expect(robotsRules('http://localhost:3000')).toEqual({ allow: [], disallow: ['/'] });
  });
  it('numbers breadcrumbs from 1', () => {
    const b = breadcrumbList('https://printyourvibe.in', [
      { name: 'Home', path: '/' },
      { name: 'Wall Posters', path: '/c/wall-posters' },
    ]);
    expect(b.itemListElement[1]).toEqual({ '@type': 'ListItem', position: 2, name: 'Wall Posters', item: 'https://printyourvibe.in/c/wall-posters' });
  });
  it('describes the store, with social links and contact only when set', () => {
    const [org, site] = storeLd('https://printyourvibe.in', { ...DEFAULT_SETTINGS, social: { ...DEFAULT_SETTINGS.social, instagram: 'https://instagram.com/pyv' } });
    expect(org).toMatchObject({ '@type': 'Organization', sameAs: ['https://instagram.com/pyv'] });
    expect(org).not.toHaveProperty('contactPoint');
    expect(site).toMatchObject({ potentialAction: { target: { urlTemplate: 'https://printyourvibe.in/search?q={search_term_string}' } } });
  });
  it('escapes < so data can’t close the script tag', () => {
    expect(ldJson({ name: '</script>' })).not.toContain('</script>');
  });
});
