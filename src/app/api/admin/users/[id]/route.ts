import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { adjustCredits } from "@/lib/credits";
import { handle, readJson, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/users/:id  Profile + recent activity. */
export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    const id = Number((await params).id);
    const pool = getPool();
    const [[user]] = (await pool.query(
      `SELECT id, email, display_name, avatar_url, role, status, credit_balance, private_mode,
              (google_id IS NOT NULL) AS has_google, (password_hash IS NOT NULL) AS has_password,
              last_login_at, created_at FROM users WHERE id = ?`,
      [id]
    )) as any;
    if (!user) throw new HttpError("ไม่พบผู้ใช้", 404);
    const [transactions] = await pool.query(
      "SELECT id, type, credit_amount, balance_after, note, created_at FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 30",
      [id]
    );
    const [generations] = await pool.query(
      `SELECT g.id, m.name AS model_name, g.status, g.result_url, g.thumbnail_url, g.media_type,
              g.cost_credit, g.created_at
         FROM generations g LEFT JOIN models m ON m.id = g.model_id
        WHERE g.user_id = ? ORDER BY g.id DESC LIMIT 12`,
      [id]
    );
    return { user, transactions, generations };
  });
}

/**
 * PATCH /api/admin/users/:id
 * { role?, status?, creditDelta?, note? }
 */
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const admin = await requireAdmin();
    const id = Number((await params).id);
    const body = await readJson(req);
    const pool = getPool();

    if (body.role !== undefined) {
      if (!["user", "admin"].includes(body.role)) throw new HttpError("role ไม่ถูกต้อง");
      if (id === admin.id && body.role !== "admin") throw new HttpError("ไม่สามารถลดสิทธิ์ตัวเองได้");
      await pool.execute("UPDATE users SET role = ? WHERE id = ?", [body.role, id]);
    }
    if (body.status !== undefined) {
      if (!["active", "banned"].includes(body.status)) throw new HttpError("status ไม่ถูกต้อง");
      if (id === admin.id && body.status === "banned") throw new HttpError("ไม่สามารถระงับบัญชีตัวเองได้");
      await pool.execute("UPDATE users SET status = ? WHERE id = ?", [body.status, id]);
    }
    if (body.privateMode !== undefined) {
      await pool.execute("UPDATE users SET private_mode = ? WHERE id = ?", [body.privateMode ? 1 : 0, id]);
    }
    if (body.creditDelta !== undefined) {
      const delta = Math.trunc(Number(body.creditDelta));
      if (!Number.isFinite(delta) || delta === 0) throw new HttpError("จำนวน credit ไม่ถูกต้อง");
      const note = String(body.note ?? "").trim().slice(0, 200) || `ปรับโดย admin #${admin.id}`;
      const balance = await adjustCredits({
        userId: id,
        delta,
        type: "adjust",
        refType: "admin",
        refId: String(admin.id),
        note,
      });
      return { ok: true, credit_balance: balance };
    }
    return { ok: true };
  });
}
