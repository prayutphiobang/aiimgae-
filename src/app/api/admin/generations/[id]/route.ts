import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/generations/:id  { hidden: boolean }
 * Hides a generation from the member's gallery (kept for accounting/audit).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const id = Number((await params).id);
    if (!Number.isInteger(id)) throw new HttpError("id ไม่ถูกต้อง");
    const body = await readJson(req);
    if (body.hidden === undefined) throw new HttpError("ไม่มีข้อมูลที่จะแก้ไข");

    const [res] = (await getPool().execute("UPDATE generations SET hidden = ? WHERE id = ?", [
      body.hidden ? 1 : 0,
      id,
    ])) as any;
    if (!res.affectedRows) throw new HttpError("ไม่พบรายการ", 404);
    return { ok: true, hidden: !!body.hidden };
  });
}
