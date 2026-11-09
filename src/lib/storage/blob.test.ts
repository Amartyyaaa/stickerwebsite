import { beforeEach, describe, expect, it, vi } from 'vitest';

// The SDK is replaced, so these tests need no Vercel account or network.
const sdk = vi.hoisted(() => ({ put: vi.fn(), get: vi.fn(), del: vi.fn(), token: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@vercel/blob', () => ({ put: sdk.put, get: sdk.get, del: sdk.del }));
vi.mock('@vercel/blob/client', () => ({ generateClientTokenFromReadWriteToken: sdk.token }));

const { BlobStorage } = await import('./blob');
const { MAX_UPLOAD_BYTES } = await import('@/lib/custom/types');

const streamOf = (text: string) => new Response(text).body!;

describe('Vercel Blob storage', () => {
  const blob = new BlobStorage();
  beforeEach(() => vi.clearAllMocks());

  it('sends uploads straight to Blob, never through the app', () => {
    expect(blob.viaApp).toBe(false);
  });

  it('gives the browser a token for exactly one file, its type and its size', async () => {
    sdk.token.mockResolvedValue('client-token');
    const target = await blob.uploadTarget({ id: 'abc', key: 'originals/AbCdEfGhIjKlMnOpQrStUv', contentType: 'image/jpeg', bytes: 2_000_000 });
    expect(target).toEqual({ blob: { pathname: 'originals/AbCdEfGhIjKlMnOpQrStUv', token: 'client-token', contentType: 'image/jpeg' } });
    const options = sdk.token.mock.calls[0][0];
    expect(options).toMatchObject({ pathname: 'originals/AbCdEfGhIjKlMnOpQrStUv', maximumSizeInBytes: 2_000_000, allowedContentTypes: ['image/jpeg'], addRandomSuffix: false, allowOverwrite: false });
    expect(options.validUntil).toBeGreaterThan(Date.now());
  });

  it('never allows more than the upload limit, whatever size the browser claims', async () => {
    sdk.token.mockResolvedValue('t');
    await blob.uploadTarget({ id: 'x', key: 'originals/x', contentType: 'image/png', bytes: MAX_UPLOAD_BYTES * 10 });
    expect(sdk.token.mock.calls[0][0].maximumSizeInBytes).toBe(MAX_UPLOAD_BYTES);
  });

  it('keeps every file private', async () => {
    await blob.put('previews/abc.webp', Buffer.from('x'));
    expect(sdk.put).toHaveBeenCalledWith('previews/abc.webp', Buffer.from('x'), { access: 'private', addRandomSuffix: false, allowOverwrite: true });
    sdk.get.mockResolvedValue({ statusCode: 200, stream: streamOf('hello') });
    expect((await blob.get('previews/abc.webp'))?.toString()).toBe('hello');
    expect(sdk.get).toHaveBeenCalledWith('previews/abc.webp', { access: 'private' });
  });

  it('returns null for a missing file', async () => {
    sdk.get.mockResolvedValue(null);
    expect(await blob.get('thumbs/missing.webp')).toBeNull();
  });

  it('deletes several files at once, and nothing when given nothing', async () => {
    await blob.delete(['originals/a', 'previews/a.webp']);
    expect(sdk.del).toHaveBeenCalledWith(['originals/a', 'previews/a.webp']);
    await blob.delete([]);
    expect(sdk.del).toHaveBeenCalledTimes(1);
  });

  it('refuses keys that could reach outside the store', async () => {
    await expect(blob.put('../etc/passwd', Buffer.from(''))).rejects.toThrow(/Invalid storage key/);
    await expect(blob.get('originals/../../x')).rejects.toThrow(/Invalid storage key/);
  });
});
