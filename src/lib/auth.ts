import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getPool, type RowDataPacket, type ResultSetHeader } from "@/lib/db";
import { adjustCredits } from "@/lib/credits";
import { getSettings } from "@/lib/settings";
import { getConfig } from "@/lib/serverConfig";
import { parsePrefs } from "@/lib/prefs";

const COOKIE_NAME = "session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not configured in .env");
  return new TextEncoder().encode(s);
}

export type Role = "user" | "admin";

export interface SessionPayload {
  uid: number;
  email: string;
  role: Role;
}

export interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  avatar_url: string | null;
  display_name: string | null;
  role: Role;
  status: "active" | "banned";
  credit_balance: number;
  private_mode: number;
  prefs: string | null;
  created_at: Date;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Create a new account and grant the signup bonus (from settings).
 * The account matching ADMIN_EMAIL becomes admin.
 */
export async function createUserAccount(input: {
  email: string;
  passwordHash: string | null;
  displayName?: string | null;
  googleId?: string | null;
  avatarUrl?: string | null;
}): Promise<{ id: number; email: string; role: Role }> {
  const email = input.email.toLowerCase();
  const adminEmail = (await getConfig("ADMIN_EMAIL")).toLowerCase();
  const role: Role = email === adminEmail ? "admin" : "user";
  const [res] = await getPool().execute<ResultSetHeader>(
    `INSERT INTO users (email, password_hash, google_id, avatar_url, display_name, role, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [email, input.passwordHash, input.googleId ?? null, input.avatarUrl ?? null, input.displayName ?? null, role]
  );
  const bonus = (await getSettings()).signup_bonus_credit;
  if (bonus > 0) {
    await adjustCredits({
      userId: res.insertId,
      delta: Math.floor(bonus),
      type: "bonus",
      refType: "signup",
      note: "โบนัสสมัครสมาชิก",
    });
  }
  return { id: res.insertId, email, role };
}

/** Find by google_id → link by email → or create a new account. */
export async function upsertGoogleUser(profile: GoogleProfile) {
  const pool = getPool();
  const email = profile.email.toLowerCase();

  const [byGoogle] = await pool.query<UserRow[]>(
    "SELECT id, email, role, status FROM users WHERE google_id = ? LIMIT 1",
    [profile.sub]
  );
  let found = byGoogle[0];

  if (!found) {
    const [byEmail] = await pool.query<UserRow[]>(
      "SELECT id, email, role, status FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    found = byEmail[0];
    if (found) {
      await pool.execute(
        `UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?),
                display_name = COALESCE(display_name, ?) WHERE id = ?`,
        [profile.sub, profile.picture ?? null, profile.name ?? null, found.id]
      );
    }
  }

  if (found) {
    if (found.status === "banned") throw new AuthError("บัญชีนี้ถูกระงับ", 403);
    await touchLogin(found.id);
    return { id: found.id, email: found.email, role: found.role };
  }

  return createUserAccount({
    email,
    passwordHash: null,
    displayName: profile.name ?? null,
    googleId: profile.sub,
    avatarUrl: profile.picture ?? null,
  });
}

export async function touchLogin(userId: number) {
  await getPool().execute("UPDATE users SET last_login_at = NOW() WHERE id = ?", [userId]);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      uid: Number(payload.uid),
      email: String(payload.email),
      role: (payload.role as Role) ?? "user",
    };
  } catch {
    return null;
  }
}

/**
 * Current user, loaded fresh from the DB (role/status are never trusted from the cookie).
 * Banned users are treated as logged out.
 */
export async function getCurrentUser(): Promise<UserRow | null> {
  const session = await getSession();
  if (!session) return null;
  const [rows] = await getPool().query<UserRow[]>(
    `SELECT id, email, password_hash, google_id, avatar_url, display_name, role, status,
            credit_balance, private_mode, prefs, created_at
       FROM users WHERE id = ? LIMIT 1`,
    [session.uid]
  );
  const user = rows[0];
  if (!user || user.status === "banned") return null;
  return user;
}

export async function requireUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("กรุณาเข้าสู่ระบบ", 401);
  return user;
}

export async function requireAdmin(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new AuthError("สำหรับผู้ดูแลระบบเท่านั้น", 403);
  return user;
}

/** Safe public view of a user. */
export function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    display_name: u.display_name,
    avatar_url: u.avatar_url,
    role: u.role,
    credit_balance: Number(u.credit_balance),
    private_mode: !!u.private_mode,
    prefs: parsePrefs(u.prefs),
    has_password: !!u.password_hash,
    has_google: !!u.google_id,
    created_at: u.created_at,
  };
}
