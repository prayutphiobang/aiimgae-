import { getPool, type ResultSetHeader } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";
import { MODEL_COLUMNS, type ModelRow } from "@/lib/models";
import { parseModelInput, withSellPrice } from "@/lib/modelInput";

export const dynamic = "force-dynamic";

/** GET /api/admin/models  All models with cost/profit + usage counts. */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const [rows] = await getPool().query<ModelRow[]>(
      `SELECT ${MODEL_COLUMNS.split(",").map((c) => "m." + c.trim()).join(", ")},
              (SELECT COUNT(*) FROM generations g WHERE g.model_id = m.id AND g.refunded = 0) AS gen_count
         FROM models m ORDER BY m.sort_order ASC, m.id ASC`
    );
    return { items: rows };
  });
}

/** POST /api/admin/models  Create a model. */
export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const fields = withSellPrice(parseModelInput(await readJson(req), false));
    const cols = Object.keys(fields);
    try {
      const [res] = await getPool().execute<ResultSetHeader>(
        `INSERT INTO models (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
        cols.map((c) => fields[c] as any)
      );
      return { id: res.insertId, sell_price_credit: fields.sell_price_credit };
    } catch (e: any) {
      if (e?.code === "ER_DUP_ENTRY") throw new HttpError("feature_uid นี้มีอยู่แล้ว", 409);
      throw e;
    }
  });
}
