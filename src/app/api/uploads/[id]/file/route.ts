import { jsonError } from '@/lib/api';
import { MAX_UPLOAD_BYTES } from '@/lib/custom/types';
import { getStorage, TooLargeError } from '@/lib/storage';
import { receiveUpload, UploadError } from '@/lib/uploads';

const TOO_LARGE = 'That file is bigger than the size we were told, or over 25 MB. Please try again.';

/** Receive the file for an upload (only used when files are stored on this server). */
export async function PUT(request: Request, ctx: RouteContext<'/api/uploads/[id]/file'>) {
  const { id } = await ctx.params;
  if (!getStorage().viaApp) return jsonError('Uploads go straight to storage.', 405);
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) return jsonError(TOO_LARGE, 413);
  try {
    await receiveUpload(id, request.body);
  } catch (err) {
    if (err instanceof TooLargeError) return jsonError(TOO_LARGE, 413);
    if (err instanceof UploadError) return jsonError(err.message, err.status);
    throw err;
  }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
