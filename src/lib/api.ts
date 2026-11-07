/** JSON response that is never cached. */
export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export const jsonError = (message: string, status: number) => json({ error: message }, status);
