import { getPool } from "@/lib/db";
import { handle, paging } from "@/lib/api";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/explore
 * Public gallery. No auth required.
 * Only shows successful, non-hidden work from users who are not in private mode.
 * Filters: q, modelId, media, creator, exclude, before, after, sort
 */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const { page, size, offset } = paging(url, 30);

    const where = [
      "g.status = 'success'",
      "g.result_url IS NOT NULL",
      "g.hidden = 0",
      "g.is_public = 1",
      "u.private_mode = 0",
      "u.status = 'active'",
    ];
    const args: unknown[] = [];

    const media = url.searchParams.get("media");
    if (media === "image" || media === "video") {
      where.push("g.media_type = ?");
      args.push(media);
    }

    const modelIds = (url.searchParams.get("modelId") ?? "")
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 20);
    if (modelIds.length) {
      where.push(`g.model_id IN (${modelIds.map(() => "?").join(",")})`);
      args.push(...modelIds);
    }

    // Creator names to include / exclude (comma separated).
    const names = (raw: string | null) =>
      (raw ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);

    const creators = names(url.searchParams.get("creator"));
    if (creators.length) {
      where.push(`(${creators.map(() => "u.display_name LIKE ? OR u.email LIKE ?").join(" OR ")})`);
      for (const c of creators) args.push(`%${c}%`, `%${c}%`);
    }
    const excluded = names(url.searchParams.get("exclude"));
    for (const c of excluded) {
      where.push("(COALESCE(u.display_name,'') NOT LIKE ? AND u.email NOT LIKE ?)");
      args.push(`%${c}%`, `%${c}%`);
    }

    const after = url.searchParams.get("after");
    if (after && DATE_RE.test(after)) {
      where.push("g.created_at >= ?");
      args.push(after);
    }
    const before = url.searchParams.get("before");
    if (before && DATE_RE.test(before)) {
      where.push("g.created_at < ?");
      args.push(before);
    }

    const q = url.searchParams.get("q")?.trim();
    if (q) {
      where.push("(g.prompt LIKE ? OR m.name LIKE ? OR u.display_name LIKE ?)");
      args.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const ORDER: Record<string, string> = {
      new: "g.id DESC",
      old: "g.id ASC",
      popular: "g.views DESC, g.id DESC",
    };
    const order = ORDER[url.searchParams.get("sort") ?? "new"] ?? ORDER.new;

    const pool = getPool();
    const w = where.join(" AND ");
    const from =
      "FROM generations g JOIN users u ON u.id = g.user_id LEFT JOIN models m ON m.id = g.model_id";

    const [rows] = await pool.query(
      `SELECT g.id, g.task_uid, g.user_id, g.model_id, m.name AS model_name, m.thumbnail_url AS model_thumb,
              COALESCE(NULLIF(u.display_name,''), SUBSTRING_INDEX(u.email,'@',1)) AS creator,
              u.avatar_url, g.prompt, g.negative_prompt, g.seed, g.result_url, g.thumbnail_url,
              g.media_type, g.img_ref, g.img_ref2, g.views, g.created_at
         ${from} WHERE ${w} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...args, size, offset]
    );
    const [[c]] = (await pool.query(`SELECT COUNT(*) AS c ${from} WHERE ${w}`, args)) as any;

    return { items: rows, total: Number(c.c), page, pageSize: size };
  });
}
