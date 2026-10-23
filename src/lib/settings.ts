import { getPool, type RowDataPacket } from "@/lib/db";

export interface Settings {
  site_name: string;
  site_tagline: string;
  announcement: string;
  support_contact: string;
  maintenance_mode: boolean;
  thb_per_credit: number;
  coin_cost_thb: number;
  signup_bonus_credit: number;
  min_topup_thb: number;
}

const DEFAULTS: Settings = {
  site_name: "AI Image Studio",
  site_tagline: "สร้างภาพสวยด้วย AI ในไม่กี่วินาที",
  announcement: "",
  support_contact: "",
  maintenance_mode: false,
  thb_per_credit: 1,
  coin_cost_thb: 0.23,
  signup_bonus_credit: 10,
  min_topup_thb: 20,
};

export const SETTING_KEYS = Object.keys(DEFAULTS) as (keyof Settings)[];

let cache: { at: number; value: Settings } | null = null;
const TTL_MS = 10_000;

function coerce(key: keyof Settings, raw: string | null): any {
  const def = DEFAULTS[key];
  if (raw === null || raw === undefined) return def;
  if (typeof def === "boolean") return raw === "1" || raw === "true";
  if (typeof def === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : def;
  }
  return raw;
}

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const out: Settings = { ...DEFAULTS };
  try {
    const [rows] = await getPool().query<RowDataPacket[]>("SELECT `key`, `value` FROM settings");
    for (const r of rows) {
      const k = r.key as keyof Settings;
      if (k in DEFAULTS) (out as any)[k] = coerce(k, r.value);
    }
  } catch {
    /* table missing -> defaults */
  }
  cache = { at: Date.now(), value: out };
  return out;
}

export async function updateSettings(patch: Partial<Record<keyof Settings, unknown>>) {
  const pool = getPool();
  for (const k of SETTING_KEYS) {
    if (!(k in patch)) continue;
    let v = patch[k];
    if (typeof DEFAULTS[k] === "boolean") v = v ? "1" : "0";
    else if (typeof DEFAULTS[k] === "number") {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) throw new Error(`ค่า ${k} ไม่ถูกต้อง`);
      v = String(n);
    } else v = String(v ?? "");
    await pool.query(
      "INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [k, v]
    );
  }
  cache = null;
}

/** Public subset safe to expose to any visitor. */
export function publicSettings(s: Settings) {
  return {
    site_name: s.site_name,
    site_tagline: s.site_tagline,
    announcement: s.announcement,
    support_contact: s.support_contact,
    maintenance_mode: s.maintenance_mode,
    min_topup_thb: s.min_topup_thb,
    thb_per_credit: s.thb_per_credit,
  };
}
