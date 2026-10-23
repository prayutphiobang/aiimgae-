import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, paging } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/admin/payments?status=&q=&page= */
export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const url = new URL(req.url);
    const { page, size, offset } = paging(url, 30);
    const where: string[] = ["1=1"];
    const args: unknown[] = [];

    const status = url.searchParams.get("status");
    if (status === "paid" || status === "pending" || status === "failed") {
      where.push("p.status = ?");
      args.push(status);
    }
    const q = url.searchParams.get("q")?.trim();
    if (q) {
      where.push("(u.email LIKE ? OR p.stripe_session_id = ? OR p.stripe_payment_intent = ?)");
      args.push(`%${q}%`, q, q);
    }

    const pool = getPool();
    const w = where.join(" AND ");
    const from = "FROM payments p LEFT JOIN users u ON u.id = p.user_id LEFT JOIN packages pk ON pk.id = p.package_id";
    const [rows] = await pool.query(
      `SELECT p.id, p.user_id, u.email, pk.name AS package_name, p.amount_thb, p.credit_added, p.status,
              p.stripe_session_id, p.stripe_payment_intent, p.created_at
         ${from} WHERE ${w} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...args, size, offset]
    );
    const [[c]] = (await pool.query(
      `SELECT COUNT(*) AS c, COALESCE(SUM(CASE WHEN p.status='paid' THEN p.amount_thb END),0) AS paid_sum ${from} WHERE ${w}`,
      args
    )) as any;
    return { items: rows, total: Number(c.c), paid_sum: Number(c.paid_sum), page, pageSize: size };
  });
}
