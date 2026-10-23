import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, paging } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/admin/users?q=&role=&status=&page=  */
export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const url = new URL(req.url);
    const { page, size, offset } = paging(url, 20);
    const where: string[] = ["1=1"];
    const args: unknown[] = [];

    const q = url.searchParams.get("q")?.trim();
    if (q) {
      where.push("(u.email LIKE ? OR u.display_name LIKE ?)");
      args.push(`%${q}%`, `%${q}%`);
    }
    const role = url.searchParams.get("role");
    if (role === "admin" || role === "user") {
      where.push("u.role = ?");
      args.push(role);
    }
    const status = url.searchParams.get("status");
    if (status === "active" || status === "banned") {
      where.push("u.status = ?");
      args.push(status);
    }

    const pool = getPool();
    const w = where.join(" AND ");
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.display_name, u.avatar_url, u.role, u.status, u.credit_balance,
              (u.google_id IS NOT NULL) AS has_google, u.last_login_at, u.created_at,
              (SELECT COUNT(*) FROM generations g WHERE g.user_id = u.id) AS gen_count,
              (SELECT COALESCE(SUM(amount_thb),0) FROM payments p WHERE p.user_id = u.id AND p.status='paid') AS total_paid
         FROM users u WHERE ${w} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
      [...args, size, offset]
    );
    const [[c]] = (await pool.query(`SELECT COUNT(*) AS c FROM users u WHERE ${w}`, args)) as any;
    return { items: rows, total: Number(c.c), page, pageSize: size };
  });
}
