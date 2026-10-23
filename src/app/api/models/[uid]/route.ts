import { getPool } from "@/lib/db";
import { getModelByFeatureUid, publicModel } from "@/lib/models";
import { handle, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/models/:uid
 * Single active model by its Mojen feature_uid, plus a few recent public
 * generations made with it (for the detail-page gallery).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ uid: string }> }) {
  return handle(async () => {
    const { uid } = await params;
    const row = await getModelByFeatureUid(uid);
    if (!row || !row.active) throw new HttpError("ไม่พบโมเดลนี้", 404);

    const pool = getPool();
    const [gallery] = await pool.query(
      `SELECT g.id, g.task_uid, g.result_url, g.thumbnail_url, g.media_type, g.prompt
         FROM generations g JOIN users u ON u.id = g.user_id
        WHERE g.model_id = ? AND g.status = 'success' AND g.is_public = 1 AND g.hidden = 0
          AND g.result_url IS NOT NULL AND u.private_mode = 0 AND u.status = 'active'
        ORDER BY g.id DESC LIMIT 12`,
      [row.id]
    );

    return { model: publicModel(row), gallery };
  });
}
