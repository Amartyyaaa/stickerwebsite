'use client';

/** The last resort, if even the page frame fails. It has to bring its own document and styles. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b0b12', color: '#f5f5f7', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 24 }}>
        <title>Something went wrong | PrintYourVibe</title>
        <div>
          <p style={{ color: '#c6ff3d', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 13 }}>PrintYourVibe</p>
          <h1 style={{ fontSize: 40, margin: '8px 0 12px' }}>Something went wrong</h1>
          <p style={{ color: '#a3a3ba', maxWidth: 420, margin: '0 auto 20px' }}>It’s a hiccup on our side. Your cart is safe in your browser.</p>
          <button type="button" onClick={() => retry()} style={{ background: '#c6ff3d', color: '#0b0b12', border: 0, padding: '12px 24px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
