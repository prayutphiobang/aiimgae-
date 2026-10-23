import { NextResponse } from "next/server";
import { getCurrentUser, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/auth/me */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user: user ? publicUser(user) : null });
}
