import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { requireUser, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * POST /api/upload  (multipart/form-data, field "file")
 * Saves the image under public/uploads and returns a public URL.
 */
export async function POST(req: Request) {
  try {
    await requireUser();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 });
    }

    const ext = ALLOWED[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "รองรับเฉพาะไฟล์ PNG, JPG, WEBP, GIF" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "ไฟล์ใหญ่เกินไป (สูงสุด 10MB)" },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const name = `${Date.now()}_${randomBytes(6).toString("hex")}.${ext}`;

    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), bytes);

    // Return a same-origin URL so the preview works however the site is opened
    // (localhost or tunnel). /api/generate rewrites it to the live public URL for Mojen.
    const origin = new URL(req.url).origin;
    const url = `${origin}/uploads/${name}`;

    return NextResponse.json({ url, path: `/uploads/${name}` });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err?.message ?? "อัปโหลดไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
