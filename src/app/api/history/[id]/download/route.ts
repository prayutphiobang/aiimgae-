import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, HttpError } from "@/lib/api";
import { streamAsDownload } from "@/lib/download";

export const dynamic = "force-dynamic";

/**
 * GET /api/history/:id/download
 * Streams the owner's generation file back as an attachment so the browser
 * forces a download (cross-origin cdn links with `download` attr don't).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const genId = Number(id);
    if (!Number.isInteger(genId) || genId <= 0) throw new HttpError("id ไม่ถูกต้อง");

    const pool = getPool();
    const [[row]] = (await pool.query(
      "SELECT result_url, media_type FROM generations WHERE id = ? AND user_id = ? LIMIT 1",
      [genId, user.id]
    )) as any;

    if (!row || !row.result_url) throw new HttpError("ไม่พบไฟล์", 404);
    return streamAsDownload(row.result_url, row.media_type, `gen-${genId}`);
  });
}
