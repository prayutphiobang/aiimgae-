import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/admin/creators  Users who have generated something, for filter dropdowns. */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const [rows] = await getPool().query(
      `SELECT u.id, u.email, u.display_name, u.avatar_url, COUNT(g.id) AS gens,
              COALESCE(SUM(g.media_type = 'video'),0) AS videos
         FROM users u JOIN generations g ON g.user_id = u.id
        GROUP BY u.id, u.email, u.display_name, u.avatar_url
        ORDER BY gens DESC`
    );
    return { items: rows };
  });
}
