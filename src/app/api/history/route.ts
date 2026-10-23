import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, paging } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/history?page=&pageSize=&status=&modelId=&q=
 * Current user's generations (excluding hidden ones).
 */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const { page, size, offset } = paging(url, 24);

    const where: string[] = ["g.user_id = ?", "g.hidden = 0"];
    const args: unknown[] = [user.id];

    const status = url.searchParams.get("status");
    if (status === "success") where.push("g.status = 'success'");
    else if (status === "failed") where.push("g.status IN ('failed','error')");
    else if (status === "pending") where.push("g.status NOT IN ('success','failed','error')");

    const modelId = Number(url.searchParams.get("modelId"));
    if (Number.isInteger(modelId) && modelId > 0) {
      where.push("g.model_id = ?");
      args.push(modelId);
    }
    const media = url.searchParams.get("media");
    if (media === "image" || media === "video") {
      where.push("g.media_type = ?");
      args.push(media);
    }
    const q = url.searchParams.get("q")?.trim();
    if (q) {
      // Search prompt or image-ref code (task uid).
      where.push("(g.prompt LIKE ? OR g.task_uid = ?)");
      args.push(`%${q}%`, q);
    }

    const pool = getPool();
    const whereSql = where.join(" AND ");
    const [rows] = await pool.query(
      `SELECT g.id, g.task_uid, g.model_id, m.name AS model_name, g.seed, g.prompt, g.negative_prompt, g.img_ref, g.img_ref2,
              g.status, g.result_url, g.thumbnail_url, g.media_type, g.error, g.cost_credit, g.refunded,
              g.is_public, g.views, g.created_at
         FROM generations g LEFT JOIN models m ON m.id = g.model_id
        WHERE ${whereSql}
        ORDER BY g.id DESC LIMIT ? OFFSET ?`,
      [...args, size, offset]
    );
    const [[c]] = (await pool.query(`SELECT COUNT(*) AS c FROM generations g WHERE ${whereSql}`, args)) as any;
    return { items: rows, total: Number(c.c), page, pageSize: size };
  });
}
