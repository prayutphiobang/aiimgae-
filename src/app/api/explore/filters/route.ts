import { getPool } from "@/lib/db";
import { handle } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/explore/filters  Models and creators that appear in the public gallery. */
export async function GET() {
  return handle(async () => {
    const pool = getPool();
    const visible =
      "g.status = 'success' AND g.result_url IS NOT NULL AND g.hidden = 0 AND g.is_public = 1 AND u.private_mode = 0 AND u.status = 'active'";

    const [models] = await pool.query(
      `SELECT m.id, m.name, COUNT(*) AS gens
         FROM generations g JOIN users u ON u.id = g.user_id JOIN models m ON m.id = g.model_id
        WHERE ${visible} GROUP BY m.id, m.name ORDER BY gens DESC`
    );
    const [creators] = await pool.query(
      `SELECT COALESCE(NULLIF(u.display_name,''), SUBSTRING_INDEX(u.email,'@',1)) AS name,
              u.avatar_url, COUNT(*) AS gens
         FROM generations g JOIN users u ON u.id = g.user_id
        WHERE ${visible} GROUP BY u.id, name, u.avatar_url ORDER BY gens DESC LIMIT 50`
    );
    return { models, creators };
  });
}
