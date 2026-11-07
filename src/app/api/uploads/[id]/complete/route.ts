import { json, jsonError } from '@/lib/api';
import { processUpload, UploadError } from '@/lib/uploads';

/** Check an uploaded file and make its preview. Returns what the studio needs to show it. */
export async function POST(_request: Request, ctx: RouteContext<'/api/uploads/[id]/complete'>) {
  const { id } = await ctx.params;
  try {
    return json(await processUpload(id));
  } catch (err) {
    if (err instanceof UploadError) return jsonError(err.message, err.status);
    throw err;
  }
}
