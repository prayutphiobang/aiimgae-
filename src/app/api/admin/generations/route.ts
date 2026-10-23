import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, paging } from "@/lib/api";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/admin/generations
 * Filters: status, modelId, userId, media (image|video), q, from, to, sort (new|old|cost)
 * Used by both the table view and the admin gallery.
 */
export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const url = new URL(req.url);
    const { page, size, offset } = paging(url, 30);
    const where: string[] = ["1=1"];
    const args: unknown[] = [];

    const status = url.searchParams.get("status");
    if (status === "success") where.push("g.status = 'success'");
    else if (status === "failed") where.push("g.status IN ('failed','error')");
    else if (status === "pending") where.push("g.status NOT IN ('success','failed','error')");

    const modelId = Number(url.searchParams.get("modelId"));
    if (Number.isInteger(modelId) && modelId > 0) {
      where.push("g.model_id = ?");
      args.push(modelId);
    }

    const userId = Number(url.searchParams.get("userId"));
    if (Number.isInteger(userId) && userId > 0) {
      where.push("g.user_id = ?");
      args.push(userId);
    }

    const media = url.searchParams.get("media");
    if (media === "image" || media === "video") {
      where.push("g.media_type = ?");
      args.push(media);
    }

    // Only rows that actually have something to display (for the gallery).
    if (url.searchParams.get("hasMedia") === "1") where.push("g.result_url IS NOT NULL");

    const from = url.searchParams.get("from");
    if (from && DATE_RE.test(from)) {
      where.push("g.created_at >= ?");
      args.push(from);
    }
    const to = url.searchParams.get("to");
    if (to && DATE_RE.test(to)) {
      where.push("g.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
      args.push(to);
    }

    const q = url.searchParams.get("q")?.trim();
    if (q) {
      where.push("(u.email LIKE ? OR u.display_name LIKE ? OR g.prompt LIKE ? OR g.task_uid = ?)");
      args.push(`%${q}%`, `%${q}%`, `%${q}%`, q);
    }

    const ORDER: Record<string, string> = {
      new: "g.id DESC",
      old: "g.id ASC",
      cost: "g.cost_credit DESC, g.id DESC",
    };
    const order = ORDER[url.searchParams.get("sort") ?? "new"] ?? ORDER.new;

    const pool = getPool();
    const w = where.join(" AND ");
    const fromSql =
      "FROM generations g LEFT JOIN users u ON u.id = g.user_id LEFT JOIN models m ON m.id = g.model_id";
    const [rows] = await pool.query(
      `SELECT g.id, g.task_uid, g.user_id, u.email, u.display_name, u.avatar_url,
              m.name AS model_name, g.prompt, g.negative_prompt, g.img_ref, g.img_ref2, g.seed, g.status,
              g.result_url, g.thumbnail_url, g.media_type, g.error, g.cost_credit, g.cost_coin,
              g.refunded, g.hidden, g.created_at
         ${fromSql} WHERE ${w} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...args, size, offset]
    );
    const [[c]] = (await pool.query(
      `SELECT COUNT(*) AS c,
              COALESCE(SUM(g.media_type = 'video'),0) AS videos,
              COALESCE(SUM(g.media_type = 'image'),0) AS images,
              COALESCE(SUM(g.cost_credit),0) AS credit
         ${fromSql} WHERE ${w}`,
      args
    )) as any;

    return {
      items: rows,
      total: Number(c.c),
      videos: Number(c.videos),
      images: Number(c.images),
      credit: Number(c.credit),
      page,
      pageSize: size,
    };
  });
}
