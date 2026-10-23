import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, paging } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/account/payments  Current user's top-up receipts. */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { page, size, offset } = paging(new URL(req.url), 20);
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT p.id, p.amount_thb, p.credit_added, p.status, p.created_at, pk.name AS package_name
         FROM payments p LEFT JOIN packages pk ON pk.id = p.package_id
        WHERE p.user_id = ? ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [user.id, size, offset]
    );
    const [[c]] = (await pool.query("SELECT COUNT(*) AS c FROM payments WHERE user_id = ?", [user.id])) as any;
    return { items: rows, total: Number(c.c), page, pageSize: size };
  });
}
