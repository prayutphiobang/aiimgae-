import { getPool } from "@/lib/db";
import { verifyPassword, createSession, touchLogin, type UserRow } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** POST /api/auth/login  { email, password } */
export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    const [rows] = await getPool().query<UserRow[]>(
      "SELECT id, email, password_hash, role, status FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    const user = rows[0];
    if (!user) throw new HttpError("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    if (!user.password_hash) throw new HttpError("บัญชีนี้ใช้การเข้าสู่ระบบด้วย Google", 401);
    if (!(await verifyPassword(password, user.password_hash)))
      throw new HttpError("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    if (user.status === "banned") throw new HttpError("บัญชีนี้ถูกระงับ กรุณาติดต่อผู้ดูแล", 403);

    await touchLogin(user.id);
    await createSession({ uid: user.id, email: user.email, role: user.role });
    return { id: user.id, email: user.email, role: user.role };
  });
}
