import { getPool, type RowDataPacket } from "@/lib/db";
import { handle, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/explore/:id
 * Single public item + a few "you may also like" suggestions. Counts one view.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = Number((await params).id);
    if (!Number.isInteger(id)) throw new HttpError("id ไม่ถูกต้อง");
    const pool = getPool();
    const visible =
      "g.status = 'success' AND g.result_url IS NOT NULL AND g.hidden = 0 AND g.is_public = 1 AND u.private_mode = 0 AND u.status = 'active'";

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT g.id, g.user_id, g.model_id, m.name AS model_name, m.thumbnail_url AS model_thumb,
              m.description AS model_description,
              COALESCE(NULLIF(u.display_name,''), SUBSTRING_INDEX(u.email,'@',1)) AS creator,
              u.avatar_url, g.prompt, g.negative_prompt, g.seed, g.result_url, g.thumbnail_url,
              g.media_type, g.img_ref, g.img_ref2, g.views, g.created_at
         FROM generations g JOIN users u ON u.id = g.user_id LEFT JOIN models m ON m.id = g.model_id
        WHERE g.id = ? AND ${visible} LIMIT 1`,
      [id]
    );
    const item = rows[0];
    if (!item) throw new HttpError("ไม่พบผลงานนี้ หรือถูกตั้งเป็นส่วนตัว", 404);

    await pool.execute("UPDATE generations SET views = views + 1 WHERE id = ?", [id]);

    const [related] = await pool.query(
      `SELECT g.id, g.result_url, g.thumbnail_url, g.media_type,
              COALESCE(NULLIF(u.display_name,''), SUBSTRING_INDEX(u.email,'@',1)) AS creator,
              u.avatar_url
         FROM generations g JOIN users u ON u.id = g.user_id
        WHERE ${visible} AND g.id <> ?
        ORDER BY (g.model_id = ?) DESC, g.id DESC LIMIT 24`,
      [id, item.model_id]
    );

    return { item: { ...item, views: Number(item.views) + 1 }, related };
  });
}
