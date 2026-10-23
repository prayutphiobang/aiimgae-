import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getConfigs } from "@/lib/serverConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google
 * Starts the Google OAuth flow by redirecting to the consent screen.
 */
export async function GET() {
  const cfg = await getConfigs(["GOOGLE_CLIENT_ID", "APP_URL"]);
  const clientId = cfg.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID (ตั้งได้ที่หน้า admin หรือใน .env)" },
      { status: 500 }
    );
  }

  const appUrl = cfg.APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  // CSRF protection: random state stored in a short-lived cookie.
  const state = randomBytes(16).toString("hex");
  const store = await cookies();
  store.set("g_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
