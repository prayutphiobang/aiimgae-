import { HttpError } from "@/lib/api";

/** Validate an admin package payload (fixed column whitelist). */
export function parsePackageInput(body: Record<string, any>, partial: boolean) {
  const out: Record<string, unknown> = {};
  const has = (k: string) => body[k] !== undefined;

  if (has("name") || !partial) {
    const v = String(body.name ?? "").trim();
    if (!v) throw new HttpError("ต้องระบุชื่อแพ็กเกจ");
    out.name = v.slice(0, 80);
  }
  const int = (k: string, min: number, max: number, required: boolean) => {
    if (!has(k)) {
      if (required && !partial) throw new HttpError(`ต้องระบุ ${k}`);
      return;
    }
    const n = Math.floor(Number(body[k]));
    if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(`ค่า ${k} ต้องอยู่ระหว่าง ${min}-${max}`);
    out[k] = n;
  };
  int("price_thb", 10, 1_000_000, true);
  int("credits", 1, 100_000_000, true);
  int("bonus_credits", 0, 100_000_000, false);
  int("sort_order", -9999, 9999, false);
  if (has("badge")) out.badge = String(body.badge ?? "").trim().slice(0, 30) || null;
  if (has("active")) out.active = body.active ? 1 : 0;
  return out;
}
