import 'server-only';
import { AwsClient } from 'aws4fetch';

/**
 * Just enough of the S3 API for backups to Cloudflare R2 (or any S3-compatible
 * store): put, get, list and delete objects, with signed requests.
 */

export interface BucketConfig {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/** R2 settings from the environment, or null when backups aren't set up. */
export function bucketConfig(env: NodeJS.ProcessEnv = process.env): BucketConfig | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT } = env;
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !(R2_ACCOUNT_ID || R2_ENDPOINT)) return null;
  // R2_ENDPOINT is only for testing against another S3-compatible server.
  const endpoint = (R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`).replace(/\/+$/, '');
  return { endpoint, bucket: R2_BUCKET, accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY };
}

export const NOT_SET_UP = 'Backups aren’t set up yet: add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET to .env.production.';

export interface ObjectInfo {
  key: string;
  size: number;
}

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export class Bucket {
  private aws: AwsClient;

  constructor(private config: BucketConfig) {
    this.aws = new AwsClient({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, service: 's3', region: 'auto', retries: 3 });
  }

  private url(key = '', query = ''): string {
    const path = key ? `/${key.split('/').map(encodeURIComponent).join('/')}` : '';
    return `${this.config.endpoint}/${encodeURIComponent(this.config.bucket)}${path}${query ? `?${query}` : ''}`;
  }

  private async check(res: Response, what: string): Promise<Response> {
    if (res.ok) return res;
    const body = await res.text().catch(() => '');
    const code = /<Code>([^<]+)<\/Code>/.exec(body)?.[1];
    throw new Error(`${what} failed: ${res.status}${code ? ` ${code}` : ''}`);
  }

  async put(key: string, body: Buffer, contentType = 'application/octet-stream'): Promise<void> {
    const res = await this.aws.fetch(this.url(key), { method: 'PUT', body: new Uint8Array(body), headers: { 'content-type': contentType } });
    await this.check(res, `Uploading ${key}`);
  }

  async get(key: string): Promise<Buffer | null> {
    const res = await this.aws.fetch(this.url(key));
    if (res.status === 404) return null;
    await this.check(res, `Downloading ${key}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    const res = await this.aws.fetch(this.url(key), { method: 'DELETE' });
    if (res.status !== 404) await this.check(res, `Deleting ${key}`);
  }

  /** Every object under a prefix (ListObjectsV2, 1,000 at a time). */
  async list(prefix: string): Promise<ObjectInfo[]> {
    const out: ObjectInfo[] = [];
    let token: string | null = null;
    do {
      const q = new URLSearchParams({ 'list-type': '2', prefix, 'max-keys': '1000' });
      if (token) q.set('continuation-token', token);
      const res = await this.check(await this.aws.fetch(this.url('', q.toString())), `Listing ${prefix}`);
      const xml = await res.text();
      for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
        const key = /<Key>([\s\S]*?)<\/Key>/.exec(m[1])?.[1];
        const size = /<Size>(\d+)<\/Size>/.exec(m[1])?.[1];
        if (key) out.push({ key: decode(key), size: Number(size ?? 0) });
      }
      token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? (/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? null) : null;
      if (token) token = decode(token);
    } while (token);
    return out;
  }
}
