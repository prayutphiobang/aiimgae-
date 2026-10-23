import { getPool, type RowDataPacket, type ResultSetHeader } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/support — the current user's support tickets (newest activity first). */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, subject, status, last_message_at, unread_user, created_at
         FROM support_tickets WHERE user_id = ?
        ORDER BY last_message_at DESC LIMIT 100`,
      [user.id]
    );
    return { items: rows };
  });
}

/** POST /api/support  { subject, body } — open a new ticket with its first message. */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const b = await readJson(req);
    const subject = String(b.subject ?? "").trim().slice(0, 200);
    const body = String(b.body ?? "").trim().slice(0, 5000);
    if (!subject) throw new HttpError("กรุณาใส่หัวข้อ");
    if (!body) throw new HttpError("กรุณาใส่ข้อความ");

    const pool = getPool();
    const [ins] = await pool.execute<ResultSetHeader>(
      `INSERT INTO support_tickets (user_id, subject, status, unread_admin, unread_user)
       VALUES (?, ?, 'open', 1, 0)`,
      [user.id, subject]
    );
    const ticketId = ins.insertId;
    await pool.execute("INSERT INTO support_messages (ticket_id, sender, body) VALUES (?, 'user', ?)", [
      ticketId,
      body,
    ]);
    return { id: ticketId };
  });
}
