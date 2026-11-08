/**
 * Starts the store for the browser tests (Playwright runs this as its web server):
 * a fresh database with the demo catalog, test pictures, a production build,
 * then `next start` on port 3200. See e2e/env.ts for the settings.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { E2E, serverEnv } from './env';
import { makeTestImages } from './images';

const env = { ...process.env, ...serverEnv };

function run(cmd: string, args: string[]) {
  console.log(`[e2e] ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: E2E.root, env, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`[e2e] "${cmd} ${args.join(' ')}" failed.`);
    process.exit(r.status ?? 1);
  }
}

async function main() {
  rmSync(E2E.dir, { recursive: true, force: true });
  for (const d of [E2E.dir, `${E2E.dir}/data`, E2E.uploads, E2E.outbox]) mkdirSync(d, { recursive: true });
  await makeTestImages(E2E.images);
  run('npm', ['run', '--silent', 'db:migrate']);
  run('npm', ['run', '--silent', 'db:seed', '--', 'sample']);
  run('npx', ['next', 'build']);
  console.log(`[e2e] Starting the store on ${E2E.baseURL}`);
  const server = spawn('npx', ['next', 'start', '-p', String(E2E.port)], { cwd: E2E.root, env, stdio: 'inherit' });
  const stop = () => server.kill('SIGTERM');
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  server.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
