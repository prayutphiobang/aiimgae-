import { getPool, type RowDataPacket } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

async function ownTicket(ticketId: number, userId: number) {
  const [[t]] = (await getPool().query<RowDataPacket[]>(
    "SELECT id, user_id, subject, status FROM support_tickets WHERE id = ? LIMIT 1",
    [ticketId]
  )) as any;
  if (!t || t.user_id !== userId) throw new HttpError("ไม่พบเรื่องนี้", 404);
  return t;
}

/** GET /api/support/:id — ticket + its messages (marks user's unread as read). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const id = Number((await params).id);
    if (!Number.isInteger(id)) throw new HttpError("id ไม่ถูกต้อง");
    const ticket = await ownTicket(id, user.id);

    const pool = getPool();
    const [messages] = await pool.query<RowDataPacket[]>(
      "SELECT id, sender, body, created_at FROM support_messages WHERE ticket_id = ? ORDER BY id ASC",
      [id]
    );
    await pool.execute("UPDATE support_tickets SET unread_user = 0 WHERE id = ?", [id]);
    return { ticket, messages };
  });
}

/** POST /api/support/:id  { body } — user replies; reopens the ticket for admin. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const id = Number((await params).id);
    if (!Number.isInteger(id)) throw new HttpError("id ไม่ถูกต้อง");
    const ticket = await ownTicket(id, user.id);
    if (ticket.status === "closed") throw new HttpError("เรื่องนี้ถูกปิดแล้ว");

    const body = String((await readJson(req)).body ?? "").trim().slice(0, 5000);
    if (!body) throw new HttpError("กรุณาใส่ข้อความ");

    const pool = getPool();
    await pool.execute("INSERT INTO support_messages (ticket_id, sender, body) VALUES (?, 'user', ?)", [id, body]);
    await pool.execute(
      "UPDATE support_tickets SET status = 'open', unread_admin = 1, last_message_at = NOW() WHERE id = ?",
      [id]
    );
    return { ok: true };
  });
}
