import { getPool, type RowDataPacket } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

async function getTicket(id: number) {
  const [[t]] = (await getPool().query<RowDataPacket[]>(
    `SELECT t.id, t.subject, t.status, t.created_at, t.user_id,
            u.email, COALESCE(NULLIF(u.display_name,''), SUBSTRING_INDEX(u.email,'@',1)) AS creator,
            u.avatar_url, u.credit_balance
       FROM support_tickets t JOIN users u ON u.id = t.user_id
      WHERE t.id = ? LIMIT 1`,
    [id]
  )) as any;
  if (!t) throw new HttpError("ไม่พบเรื่องนี้", 404);
  return t;
}

/** GET /api/admin/support/:id — ticket + messages (marks admin unread as read). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const id = Number((await params).id);
    if (!Number.isInteger(id)) throw new HttpError("id ไม่ถูกต้อง");
    const ticket = await getTicket(id);

    const pool = getPool();
    const [messages] = await pool.query<RowDataPacket[]>(
      "SELECT id, sender, body, created_at FROM support_messages WHERE ticket_id = ? ORDER BY id ASC",
      [id]
    );
    await pool.execute("UPDATE support_tickets SET unread_admin = 0 WHERE id = ?", [id]);
    return { ticket, messages };
  });
}

/** POST /api/admin/support/:id  { body } — admin replies; notifies the user. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const id = Number((await params).id);
    if (!Number.isInteger(id)) throw new HttpError("id ไม่ถูกต้อง");
    await getTicket(id);

    const body = String((await readJson(req)).body ?? "").trim().slice(0, 5000);
    if (!body) throw new HttpError("กรุณาใส่ข้อความ");

    const pool = getPool();
    await pool.execute("INSERT INTO support_messages (ticket_id, sender, body) VALUES (?, 'admin', ?)", [id, body]);
    await pool.execute(
      "UPDATE support_tickets SET status = 'answered', unread_user = 1, unread_admin = 0, last_message_at = NOW() WHERE id = ?",
      [id]
    );
    return { ok: true };
  });
}

/** PATCH /api/admin/support/:id  { status } — change ticket status. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const id = Number((await params).id);
    if (!Number.isInteger(id)) throw new HttpError("id ไม่ถูกต้อง");
    const status = String((await readJson(req)).status ?? "");
    if (!["open", "answered", "closed"].includes(status)) throw new HttpError("สถานะไม่ถูกต้อง");
    await getTicket(id);
    await getPool().execute("UPDATE support_tickets SET status = ? WHERE id = ?", [status, id]);
    return { ok: true };
  });
}
