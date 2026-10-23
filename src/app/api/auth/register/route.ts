import { getPool } from "@/lib/db";
import { hashPassword, createSession, createUserAccount } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** POST /api/auth/register  { email, password, displayName? } */
export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const displayName = body.displayName ? String(body.displayName).trim().slice(0, 120) : null;

    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError("อีเมลไม่ถูกต้อง");
    if (password.length < 6) throw new HttpError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");

    const [existing] = (await getPool().query("SELECT id FROM users WHERE email = ? LIMIT 1", [email])) as any;
    if (existing.length) throw new HttpError("อีเมลนี้ถูกใช้แล้ว", 409);

    const user = await createUserAccount({
      email,
      passwordHash: await hashPassword(password),
      displayName,
    });
    await createSession({ uid: user.id, email: user.email, role: user.role });
    return user;
  });
}
