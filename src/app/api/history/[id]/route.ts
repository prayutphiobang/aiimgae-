import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** DELETE /api/history/:id  Hide a generation from the user's gallery (kept for accounting). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const [res] = (await getPool().execute(
      "UPDATE generations SET hidden = 1 WHERE id = ? AND user_id = ?",
      [Number(id), user.id]
    )) as any;
    if (!res.affectedRows) throw new HttpError("ไม่พบรายการ", 404);
    return { ok: true };
  });
}
