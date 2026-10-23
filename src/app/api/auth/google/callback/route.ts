import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, upsertGoogleUser, type GoogleProfile } from "@/lib/auth";
import { getConfigs } from "@/lib/serverConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/callback?code=...&state=...
 * Exchanges the code for tokens, reads the Google profile, upserts the user,
 * creates our session cookie, then redirects back to the app.
 */
export async function GET(req: Request) {
  const cfg = await getConfigs(["APP_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
  const appUrl = cfg.APP_URL || "http://localhost:3000";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const expectedState = store.get("g_state")?.value;
  store.set("g_state", "", { path: "/", maxAge: 0 }); // clear it

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/login?error=google_state`);
  }

  const clientId = cfg.GOOGLE_CLIENT_ID;
  const clientSecret = cfg.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/login?error=google_config`);
  }

  try {
    // 1) Exchange authorization code for tokens.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || !token.access_token) {
      return NextResponse.redirect(`${appUrl}/login?error=google_token`);
    }

    // 2) Fetch the user profile.
    const infoRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
        cache: "no-store",
      }
    );
    const info = await infoRes.json();
    if (!infoRes.ok || !info.email) {
      return NextResponse.redirect(`${appUrl}/login?error=google_profile`);
    }

    const profile: GoogleProfile = {
      sub: String(info.sub),
      email: String(info.email),
      name: info.name ? String(info.name) : undefined,
      picture: info.picture ? String(info.picture) : undefined,
    };

    // 3) Upsert + create our session.
    const user = await upsertGoogleUser(profile);
    await createSession({ uid: user.id, email: user.email, role: user.role });

    return NextResponse.redirect(`${appUrl}/studio`);
  } catch (err: any) {
    const code = err?.status === 403 ? "banned" : "google_failed";
    return NextResponse.redirect(`${appUrl}/login?error=${code}`);
  }
}
