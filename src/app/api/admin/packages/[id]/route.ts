import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";
import { parsePackageInput } from "@/lib/packageInput";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/packages/:id */
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    const id = Number((await params).id);
    const f = parsePackageInput(await readJson(req), true);
    const cols = Object.keys(f);
    if (!cols.length) throw new HttpError("ไม่มีข้อมูลที่จะแก้ไข");
    const [res] = (await getPool().execute(
      `UPDATE packages SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
      [...cols.map((c) => f[c] as any), id]
    )) as any;
    if (!res.affectedRows) throw new HttpError("ไม่พบแพ็กเกจ", 404);
    return { ok: true };
  });
}

/** DELETE /api/admin/packages/:id  (deactivates if it has sales) */
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    const id = Number((await params).id);
    const pool = getPool();
    const [[c]] = (await pool.query("SELECT COUNT(*) AS c FROM payments WHERE package_id = ?", [id])) as any;
    if (Number(c.c) > 0) {
      await pool.execute("UPDATE packages SET active = 0 WHERE id = ?", [id]);
      return { ok: true, deactivated: true };
    }
    await pool.execute("DELETE FROM packages WHERE id = ?", [id]);
    return { ok: true, deleted: true };
  });
}
