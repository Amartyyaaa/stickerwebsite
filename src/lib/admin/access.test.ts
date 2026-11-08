import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every way into the admin panel has to check the visitor is an admin. These
 * read the source, so a new action, route or page that forgets fails here.
 */
const root = join(__dirname, '../../..');
const files = (dir: string, match: RegExp): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path, match) : match.test(name) ? [path] : [];
  });

describe('admin access', () => {
  it('every admin server action runs through asAdmin', () => {
    const missing: string[] = [];
    for (const file of files(join(root, 'src/actions/admin'), /\.ts$/)) {
      const source = readFileSync(file, 'utf8');
      // Local helpers (not exported) that wrap asAdmin count as checking too.
      const wrappers = [...source.matchAll(/\nasync function (\w+)\(([\s\S]*?)\n}/g)].filter((m) => m[2].includes('asAdmin(')).map((m) => `${m[1]}(`);
      const guards = ['asAdmin(', ...wrappers];
      const chunks = source.split('export async function ').slice(1);
      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        const name = chunk.slice(0, chunk.indexOf('('));
        const body = chunk.split('\nexport ')[0].split('\nasync function ')[0];
        if (!guards.some((g) => body.includes(g))) missing.push(`${relative(root, file)}: ${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every admin API route checks for an admin', () => {
    const routes = files(join(root, 'src/app/api/admin'), /^route\.ts$/);
    expect(routes.length).toBeGreaterThan(5);
    const open = routes.filter((f) => !/adminRouteGuard\(|adminOrNull\(|requireAdmin\(/.test(readFileSync(f, 'utf8'))).map((f) => relative(root, f));
    expect(open).toEqual([]);
  });

  it('every admin page checks for an admin before showing data', () => {
    const pages = files(join(root, 'src/app/admin'), /^page\.tsx$/);
    expect(pages.length).toBeGreaterThan(15);
    const open = pages.filter((f) => !readFileSync(f, 'utf8').includes('adminOrNull(')).map((f) => relative(root, f));
    expect(open).toEqual([]);
  });
});
