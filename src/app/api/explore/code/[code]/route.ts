import { getPool, type RowDataPacket } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { handle, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/explore/code/:code
 * Single item looked up by its Mojen task_uid (the "imgcode" shown in the UI).
 *
 * Visibility:
 *  - The owner can view any of their own successful generations (public OR private).
 *  - Everyone else only sees public work from users not in private mode.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const code = String((await params).code ?? "").trim();
    if (!code) throw new HttpError("รหัสรูปไม่ถูกต้อง");

    const me = await getCurrentUser();
    const pool = getPool();

    // Base: must be a finished image/video that exists.
    const base = "g.status = 'success' AND g.result_url IS NOT NULL AND g.hidden = 0";
    // Public visibility for non-owners.
    const publicRule = "g.is_public = 1 AND u.private_mode = 0 AND u.status = 'active'";
    // Owner may view their own regardless of public flag.
    const visibility = me ? `(${publicRule} OR g.user_id = ?)` : publicRule;
    const whereArgs: unknown[] = [code];
    if (me) whereArgs.push(me.id);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT g.id, g.task_uid, g.user_id, g.model_id, m.name AS model_name, m.thumbnail_url AS model_thumb,
              m.extra_params AS model_extra,
              COALESCE(NULLIF(u.display_name,''), SUBSTRING_INDEX(u.email,'@',1)) AS creator,
              u.avatar_url, g.prompt, g.negative_prompt, g.seed, g.result_url, g.thumbnail_url,
              g.media_type, g.img_ref, g.img_ref2, g.is_public, g.views, g.created_at
         FROM generations g JOIN users u ON u.id = g.user_id LEFT JOIN models m ON m.id = g.model_id
        WHERE g.task_uid = ? AND ${base} AND ${visibility} LIMIT 1`,
      whereArgs
    );
    const item = rows[0];
    if (!item) throw new HttpError("ไม่พบผลงานนี้ หรือถูกตั้งเป็นส่วนตัว", 404);

    const isOwner = me?.id === item.user_id;
    // Count a view only when someone other than the owner opens it.
    if (!isOwner) {
      await pool.execute("UPDATE generations SET views = views + 1 WHERE id = ?", [item.id]);
      item.views = Number(item.views) + 1;
    }

    // Related suggestions are tied to the SAME model as this item.
    // Owner sees more of their own work; others see public work.
    const relParts = [base, "g.id <> ?"];
    const relArgs: unknown[] = [item.id];
    if (item.model_id != null) {
      relParts.push("g.model_id = ?");
      relArgs.push(item.model_id);
    }
    if (isOwner) {
      relParts.push("g.user_id = ?");
      relArgs.push(item.user_id);
    } else {
      relParts.push(publicRule);
    }

    const [related] = await pool.query(
      `SELECT g.id, g.task_uid, g.result_url, g.thumbnail_url, g.media_type,
              COALESCE(NULLIF(u.display_name,''), SUBSTRING_INDEX(u.email,'@',1)) AS creator,
              u.avatar_url
         FROM generations g JOIN users u ON u.id = g.user_id
        WHERE ${relParts.join(" AND ")}
        ORDER BY g.id DESC LIMIT 12`,
      relArgs
    );

    return { item: { ...item, is_owner: isOwner }, related };
  });
}
