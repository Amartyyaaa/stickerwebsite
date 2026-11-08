/** Runs once when the server starts. On the live server, it warns about missing or unsafe settings in the log. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const { startupWarnings } = await import('./lib/startup-check');
  for (const w of startupWarnings(process.env)) console.warn(`[setup] ${w}`);
}
