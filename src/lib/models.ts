import { getPool, type RowDataPacket } from "@/lib/db";

export interface ModelRow extends RowDataPacket {
  id: number;
  feature_uid: string;
  name: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  badge: string | null;
  instruction: string | null;
  sort_order: number;
  supports_prompt: number;
  supports_image: number;
  requires_image: number;
  prompt_max_len: number;
  est_seconds: number;
  extra_params: string | null;
  default_prompt: string | null;
  default_negative: string | null;
  supports_negative: number;
  supports_image2: number;
  requires_image2: number;
  image_label: string | null;
  image2_label: string | null;
  output_type: "image" | "video";
  cost_coin: number;
  profit_percent: number;
  sell_price_credit: number;
  active: number;
}

export const MODEL_COLUMNS = `id, feature_uid, name, description, category, thumbnail_url, badge, instruction,
  sort_order, supports_prompt, supports_image, requires_image, supports_negative,
  supports_image2, requires_image2, image_label, image2_label, output_type,
  prompt_max_len, est_seconds, extra_params, default_prompt, default_negative,
  cost_coin, profit_percent, sell_price_credit, active`;

/** Public view (cost/profit hidden; feature_uid is a non-secret Mojen id used in URLs). */
export function publicModel(m: ModelRow) {
  return {
    id: m.id,
    feature_uid: m.feature_uid,
    name: m.name,
    description: m.description,
    category: m.category,
    thumbnail_url: m.thumbnail_url,
    badge: m.badge,
    instruction: m.instruction,
    supports_prompt: !!m.supports_prompt,
    supports_image: !!m.supports_image,
    requires_image: !!m.requires_image,
    supports_negative: !!m.supports_negative,
    supports_image2: !!m.supports_image2,
    requires_image2: !!m.requires_image2,
    image_label: m.image_label,
    image2_label: m.image2_label,
    output_type: m.output_type ?? "image",
    prompt_max_len: m.prompt_max_len,
    est_seconds: m.est_seconds,
    default_prompt: m.default_prompt,
    default_negative: m.default_negative,
    price: m.sell_price_credit,
  };
}

export async function getModel(id: number): Promise<ModelRow | null> {
  const [rows] = await getPool().query<ModelRow[]>(
    `SELECT ${MODEL_COLUMNS} FROM models WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getModelByFeatureUid(uid: string): Promise<ModelRow | null> {
  const [rows] = await getPool().query<ModelRow[]>(
    `SELECT ${MODEL_COLUMNS} FROM models WHERE feature_uid = ? LIMIT 1`,
    [uid]
  );
  return rows[0] ?? null;
}

export function parseExtraParams(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
