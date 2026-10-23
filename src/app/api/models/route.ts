import { getPool } from "@/lib/db";
import { MODEL_COLUMNS, publicModel, type ModelRow } from "@/lib/models";
import { handle } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/models  Active models for members. */
export async function GET() {
  return handle(async () => {
    const [rows] = await getPool().query<ModelRow[]>(
      `SELECT ${MODEL_COLUMNS} FROM models WHERE active = 1 ORDER BY sort_order ASC, id ASC`
    );
    return { items: rows.map(publicModel) };
  });
}
