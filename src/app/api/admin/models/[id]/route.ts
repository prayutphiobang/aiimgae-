import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";
import { getModel } from "@/lib/models";
import { parseModelInput, withSellPrice } from "@/lib/modelInput";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/models/:id */
export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    const model = await getModel(Number((await params).id));
    if (!model) throw new HttpError("ไม่พบโมเดล", 404);
    return { item: model };
  });
}

/** PATCH /api/admin/models/:id  Partial update; sell price is recomputed. */
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    const id = Number((await params).id);
    const current = await getModel(id);
    if (!current) throw new HttpError("ไม่พบโมเดล", 404);

    const fields = withSellPrice(parseModelInput(await readJson(req), true), {
      cost_coin: current.cost_coin,
      profit_percent: Number(current.profit_percent),
    });
    const cols = Object.keys(fields);
    try {
      await getPool().execute(
        `UPDATE models SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
        [...cols.map((c) => fields[c] as any), id]
      );
    } catch (e: any) {
      if (e?.code === "ER_DUP_ENTRY") throw new HttpError("feature_uid นี้มีอยู่แล้ว", 409);
      throw e;
    }
    return { id, sell_price_credit: fields.sell_price_credit };
  });
}

/**
 * DELETE /api/admin/models/:id
 * Models with history are deactivated instead of deleted (keeps reports intact).
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    const id = Number((await params).id);
    const pool = getPool();
    const [[c]] = (await pool.query("SELECT COUNT(*) AS c FROM generations WHERE model_id = ?", [id])) as any;
    if (Number(c.c) > 0) {
      await pool.execute("UPDATE models SET active = 0 WHERE id = ?", [id]);
      return { ok: true, deactivated: true };
    }
    await pool.execute("DELETE FROM models WHERE id = ?", [id]);
    return { ok: true, deleted: true };
  });
}
