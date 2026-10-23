import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, paging } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/account/transactions?page=&pageSize=  Current user's credit ledger. */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { page, size, offset } = paging(new URL(req.url), 20);
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, type, credit_amount, balance_after, ref_type, ref_id, note, created_at
         FROM transactions WHERE user_id = ?
        ORDER BY id DESC LIMIT ? OFFSET ?`,
      [user.id, size, offset]
    );
    const [[c]] = (await pool.query("SELECT COUNT(*) AS c FROM transactions WHERE user_id = ?", [
      user.id,
    ])) as any;
    return { items: rows, total: Number(c.c), page, pageSize: size };
  });
}
