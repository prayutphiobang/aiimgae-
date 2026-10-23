import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/history/:id/visibility  { isPublic: boolean }
 * Lets a member show/hide one of their own results in the public gallery.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const id = Number((await params).id);
    const body = await readJson(req);
    if (body.isPublic === undefined) throw new HttpError("ไม่มีข้อมูลที่จะแก้ไข");

    const [res] = (await getPool().execute(
      "UPDATE generations SET is_public = ? WHERE id = ? AND user_id = ?",
      [body.isPublic ? 1 : 0, id, user.id]
    )) as any;
    if (!res.affectedRows) throw new HttpError("ไม่พบรายการ", 404);
    return { ok: true, is_public: !!body.isPublic };
  });
}
