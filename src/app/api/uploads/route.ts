import { z } from 'zod';
import { json, jsonError } from '@/lib/api';
import { isUploadType, MAX_UPLOAD_BYTES } from '@/lib/custom/types';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createUpload } from '@/lib/uploads';

const Body = z.object({
  name: z.string().min(1).max(300),
  type: z.string().max(100),
  size: z.number().int().positive(),
});

/** Start an upload: checks the file type and size, then says where to send the file. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('That upload request could not be read.', 400);
  const { name, type, size } = parsed.data;
  if (!isUploadType(type)) return jsonError('Please upload a PNG, JPG or WebP image.', 415);
  if (size > MAX_UPLOAD_BYTES) return jsonError('That file is over 25 MB. Try a smaller image.', 413);
  const limit = await rateLimit(`upload:${await clientIp()}`, 120, 3600);
  if (!limit.ok) return jsonError('That’s a lot of uploads in a short time. Please try again in a little while.', 429);
  return json(await createUpload({ name, type, size }), 201);
}
