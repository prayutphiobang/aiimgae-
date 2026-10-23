import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { syncPendingGenerations } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs?ids=1,2,3
 * Syncs the current user's unfinished jobs with Mojen and returns them,
 * plus the final state of any ids the client was tracking (so it can notify on completion).
 */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    await syncPendingGenerations(user.id, 20);

    const tracked = (new URL(req.url).searchParams.get("ids") ?? "")
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 50);

    const where = tracked.length
      ? "(g.status NOT IN ('success','failed','error') OR g.id IN (?))"
      : "g.status NOT IN ('success','failed','error')";
    const [rows] = await getPool().query(
      `SELECT g.id, g.task_uid, g.status, g.result_url, g.thumbnail_url, g.media_type, g.error, g.prompt, g.cost_credit, g.created_at,
              m.name AS model_name, m.est_seconds
         FROM generations g LEFT JOIN models m ON m.id = g.model_id
        WHERE g.user_id = ? AND ${where}
        ORDER BY g.id DESC LIMIT 50`,
      tracked.length ? [user.id, tracked] : [user.id]
    );
    return { items: rows };
  });
}
