import { getPool, type RowDataPacket } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, paging } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/admin/support?status=&q= — all tickets with the requester's info. */
export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const url = new URL(req.url);
    const { size, offset } = paging(url, 30);

    const where: string[] = [];
    const args: unknown[] = [];
    const status = url.searchParams.get("status");
    if (status === "open" || status === "answered" || status === "closed") {
      where.push("t.status = ?");
      args.push(status);
    }
    const q = url.searchParams.get("q")?.trim();
    if (q) {
      where.push("(t.subject LIKE ? OR u.email LIKE ? OR u.display_name LIKE ?)");
      args.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.id, t.subject, t.status, t.last_message_at, t.unread_admin, t.created_at,
              u.id AS user_id, u.email,
              COALESCE(NULLIF(u.display_name,''), SUBSTRING_INDEX(u.email,'@',1)) AS creator,
              u.avatar_url
         FROM support_tickets t JOIN users u ON u.id = t.user_id
        ${whereSql}
        ORDER BY t.unread_admin DESC, t.last_message_at DESC
        LIMIT ? OFFSET ?`,
      [...args, size, offset]
    );
    const [[c]] = (await pool.query(`SELECT COUNT(*) AS c FROM support_tickets t JOIN users u ON u.id = t.user_id ${whereSql}`, args)) as any;
    const [[open]] = (await pool.query("SELECT COUNT(*) AS c FROM support_tickets WHERE unread_admin = 1")) as any;
    return { items: rows, total: Number(c.c), unread: Number(open.c) };
  });
}
