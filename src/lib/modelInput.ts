import { HttpError } from "@/lib/api";
import { computeSellPrice } from "@/lib/pricing";

/**
 * Validate & normalise an admin model payload.
 * `partial` = PATCH semantics (only provided fields are returned).
 */
export function parseModelInput(body: Record<string, any>, partial: boolean) {
  const out: Record<string, unknown> = {};
  const has = (k: string) => body[k] !== undefined;

  const str = (k: string, max: number, required = false) => {
    if (!has(k)) {
      if (required && !partial) throw new HttpError(`ต้องระบุ ${k}`);
      return;
    }
    const v = String(body[k] ?? "").trim();
    if (required && !v) throw new HttpError(`ต้องระบุ ${k}`);
    out[k] = v ? v.slice(0, max) : null;
  };
  const int = (k: string, min: number, max: number) => {
    if (!has(k)) return;
    const n = Math.floor(Number(body[k]));
    if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(`ค่า ${k} ต้องอยู่ระหว่าง ${min}-${max}`);
    out[k] = n;
  };
  const bool = (k: string) => {
    if (has(k)) out[k] = body[k] ? 1 : 0;
  };

  // Accept a pasted mojen.ai URL and keep just the feature id.
  if (has("feature_uid")) {
    const m = String(body.feature_uid ?? "").match(/feature_[A-Za-z0-9]+/);
    if (m) body = { ...body, feature_uid: m[0] };
  }
  str("feature_uid", 128, true);
  if (out.feature_uid && !/^[A-Za-z0-9_-]+$/.test(String(out.feature_uid)))
    throw new HttpError("feature_uid ไม่ถูกต้อง (ควรเป็นรูปแบบ feature_xxxx)");
  str("name", 160, true);
  str("description", 5000);
  str("category", 60);
  str("thumbnail_url", 2000);
  str("badge", 30);
  str("instruction", 5000);
  str("default_prompt", 3000);
  str("default_negative", 3000);
  int("sort_order", -9999, 9999);
  bool("supports_prompt");
  bool("supports_image");
  bool("requires_image");
  bool("supports_negative");
  bool("supports_image2");
  bool("requires_image2");
  str("image_label", 60);
  str("image2_label", 60);
  if (has("output_type")) {
    const v = String(body.output_type);
    if (v !== "image" && v !== "video") throw new HttpError("output_type ต้องเป็น image หรือ video");
    out.output_type = v;
  }
  int("prompt_max_len", 1, 20000);
  int("est_seconds", 1, 3600);
  int("cost_coin", 0, 100000);
  bool("active");

  if (has("profit_percent")) {
    const n = Number(body.profit_percent);
    if (!Number.isFinite(n) || n < 0 || n > 10000) throw new HttpError("กำไร (%) ต้องอยู่ระหว่าง 0-10000");
    out.profit_percent = Math.round(n * 100) / 100;
  }

  if (has("extra_params")) {
    const raw = String(body.extra_params ?? "").trim();
    if (raw) {
      try {
        const v = JSON.parse(raw);
        if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error();
      } catch {
        throw new HttpError("extra_params ต้องเป็น JSON object เช่น {\"key\": 1}");
      }
    }
    out.extra_params = raw || null;
  }

  if (out.thumbnail_url && !/^(https?:\/\/|\/)/i.test(String(out.thumbnail_url)))
    throw new HttpError("thumbnail_url ต้องขึ้นต้นด้วย http(s):// หรือ /");



  return out;
}

/** Fill in sell price using final cost/profit values. */
export function withSellPrice(fields: Record<string, unknown>, current?: { cost_coin: number; profit_percent: number }) {
  const cost = Number(fields.cost_coin ?? current?.cost_coin ?? 3);
  const profit = Number(fields.profit_percent ?? current?.profit_percent ?? 100);
  fields.sell_price_credit = computeSellPrice(cost, profit);
  return fields;
}
