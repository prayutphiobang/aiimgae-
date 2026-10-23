import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST /api/history/bulk
 * { action: "delete" | "private" | "public", ids: number[] }
 * Applies a bulk action to the current user's own generations only.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await readJson(req);
    const action = String(body.action ?? "");
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 200);

    if (!ids.length) throw new HttpError("ยังไม่ได้เลือกรายการ");
    if (!["delete", "private", "public"].includes(action)) throw new HttpError("action ไม่ถูกต้อง");

    const pool = getPool();
    const placeholders = ids.map(() => "?").join(",");
    let affected = 0;

    if (action === "delete") {
      const [res] = (await pool.execute(
        `UPDATE generations SET hidden = 1 WHERE user_id = ? AND id IN (${placeholders})`,
        [user.id, ...ids]
      )) as any;
      affected = res.affectedRows;
    } else {
      const isPublic = action === "public" ? 1 : 0;
      const [res] = (await pool.execute(
        `UPDATE generations SET is_public = ? WHERE user_id = ? AND id IN (${placeholders})`,
        [isPublic, user.id, ...ids]
      )) as any;
      affected = res.affectedRows;
    }

    return { ok: true, affected };
  });
}
