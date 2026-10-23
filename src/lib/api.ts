import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";

/** Wrap a route handler body with consistent JSON error handling. */
export async function handle(fn: () => Promise<unknown>) {
  try {
    const out = await fn();
    if (out instanceof Response) return out;
    return NextResponse.json(out ?? { ok: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function readJson(req: Request): Promise<Record<string, any>> {
  return req.json().catch(() => ({}));
}

/** Parse ?page=&pageSize= with sane bounds. */
export function paging(url: URL, defSize = 20) {
  let page = Math.floor(Number(url.searchParams.get("page") ?? 1));
  let size = Math.floor(Number(url.searchParams.get("pageSize") ?? defSize));
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(size) || size < 1 || size > 100) size = defSize;
  return { page, size, offset: (page - 1) * size };
}

/** Escape a value for CSV. */
export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
