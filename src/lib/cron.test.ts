import { afterEach, describe, expect, it, vi } from 'vitest';

const run = vi.hoisted(() => vi.fn());
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('@/lib/maintenance', () => ({ runMaintenance: run }));

const { GET } = await import('@/app/api/cron/maintenance/route');
const call = (auth?: string) => GET(new Request('https://shop.example/api/cron/maintenance', { headers: auth ? { authorization: auth } : {} }));

describe('daily clean-up route (Vercel Cron)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    run.mockReset();
  });

  it('does nothing when CRON_SECRET isn’t set', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await call('Bearer ')).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses a missing or wrong secret', async () => {
    vi.stubEnv('CRON_SECRET', 'a-long-random-secret');
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong')).status).toBe(401);
    expect((await call('Bearer a-long-random-secret-and-more')).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it('runs the clean-up with the right secret', async () => {
    vi.stubEnv('CRON_SECRET', 'a-long-random-secret');
    run.mockResolvedValue('cancelled 0 unpaid order(s)');
    const res = await call('Bearer a-long-random-secret');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: 'cancelled 0 unpaid order(s)' });
    expect(run).toHaveBeenCalledTimes(1);
  });
});
