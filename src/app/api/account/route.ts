import { getPool, type RowDataPacket } from "@/lib/db";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";
import { mergePrefs, parsePrefs } from "@/lib/prefs";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/account
 * { displayName? }  or  { currentPassword?, newPassword }
 */
export async function PATCH(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await readJson(req);
    const pool = getPool();

    if (body.displayName !== undefined) {
      const name = String(body.displayName).trim().slice(0, 120);
      await pool.execute("UPDATE users SET display_name = ? WHERE id = ?", [name || null, user.id]);
    }

    if (body.privateMode !== undefined) {
      await pool.execute("UPDATE users SET private_mode = ? WHERE id = ?", [
        body.privateMode ? 1 : 0,
        user.id,
      ]);
    }

    if (body.prefs !== undefined && body.prefs && typeof body.prefs === "object") {
      const [rows] = await pool.query<RowDataPacket[]>("SELECT prefs FROM users WHERE id = ?", [user.id]);
      const next = mergePrefs(parsePrefs(rows[0]?.prefs), body.prefs);
      await pool.execute("UPDATE users SET prefs = ? WHERE id = ?", [JSON.stringify(next), user.id]);
    }

    if (body.newPassword !== undefined) {
      const next = String(body.newPassword);
      if (next.length < 6) throw new HttpError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
      // Accounts that already have a password must confirm the current one.
      if (user.password_hash) {
        const ok = await verifyPassword(String(body.currentPassword ?? ""), user.password_hash);
        if (!ok) throw new HttpError("รหัสผ่านปัจจุบันไม่ถูกต้อง", 401);
      }
      await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
        await hashPassword(next),
        user.id,
      ]);
    }
    return { ok: true };
  });
}
