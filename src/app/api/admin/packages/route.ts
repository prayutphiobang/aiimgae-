import { getPool, type ResultSetHeader } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, readJson } from "@/lib/api";
import { parsePackageInput } from "@/lib/packageInput";

export const dynamic = "force-dynamic";

/** GET /api/admin/packages  All packages + sales count. */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const [rows] = await getPool().query(
      `SELECT pk.*, (SELECT COUNT(*) FROM payments p WHERE p.package_id = pk.id AND p.status='paid') AS sold
         FROM packages pk ORDER BY pk.sort_order ASC, pk.price_thb ASC`
    );
    return { items: rows };
  });
}

/** POST /api/admin/packages */
export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const f = parsePackageInput(await readJson(req), false);
    const cols = Object.keys(f);
    const [res] = await getPool().execute<ResultSetHeader>(
      `INSERT INTO packages (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      cols.map((c) => f[c] as any)
    );
    return { id: res.insertId };
  });
}
