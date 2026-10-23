import { requireAdmin } from "@/lib/auth";
import { handle, readJson, HttpError } from "@/lib/api";
import { listStoredKeys, saveStoredKeys, keyStatuses, maskKey, type StoredKey } from "@/lib/mojenKeys";

export const dynamic = "force-dynamic";

/** Shape returned to the admin UI — never includes full key values. */
async function view() {
  const stored = await listStoredKeys();
  const statuses = await keyStatuses();
  const envCount =
    (process.env.MOJEN_API_KEY ?? "").split(/[\s,]+/).filter(Boolean).length +
    Array.from({ length: 20 }, (_, i) => (process.env[`MOJEN_API_KEY_${i + 1}`] ?? "").trim())
      .filter(Boolean).length;
  return {
    keys: stored.map((k) => ({ masked: maskKey(k.key), enabled: k.enabled !== false })),
    envCount,
    activeStatus: statuses,
  };
}

/** GET /api/admin/mojen-keys — masked list of DB keys + env key count + live status. */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    return view();
  });
}

/** POST /api/admin/mojen-keys  { key } — add a new key to the database. */
export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const body = await readJson(req);
    const key = String(body.key ?? "").trim();
    if (!key) throw new HttpError("กรุณาใส่ API key");
    if (key.length < 12) throw new HttpError("API key สั้นเกินไป ดูเหมือนไม่ถูกต้อง");

    const stored = await listStoredKeys();
    if (stored.some((k) => k.key === key)) throw new HttpError("มี key นี้อยู่แล้ว");
    stored.push({ key, enabled: true });
    await saveStoredKeys(stored);
    return view();
  });
}

/** PATCH /api/admin/mojen-keys  { index, enabled } — enable/disable a key. */
export async function PATCH(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const body = await readJson(req);
    const index = Number(body.index);
    const stored = await listStoredKeys();
    if (!Number.isInteger(index) || index < 0 || index >= stored.length)
      throw new HttpError("ไม่พบ key ที่ต้องการแก้ไข");
    stored[index].enabled = !!body.enabled;
    await saveStoredKeys(stored);
    return view();
  });
}

/** DELETE /api/admin/mojen-keys  { index } — remove a key from the database. */
export async function DELETE(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const body = await readJson(req);
    const index = Number(body.index);
    const stored = await listStoredKeys();
    if (!Number.isInteger(index) || index < 0 || index >= stored.length)
      throw new HttpError("ไม่พบ key ที่ต้องการลบ");
    stored.splice(index, 1);
    await saveStoredKeys(stored);
    return view();
  });
}
