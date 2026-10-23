/**
 * Server-side config that admins can edit at runtime via the UI.
 *
 * Values are stored in the `settings` table under `cfg_<KEY>` and fall back to
 * the matching environment variable when not set in the DB. This lets you
 * configure Stripe / Google / URLs without editing .env or restarting.
 *
 * SECURITY NOTES
 *  - AUTH_SECRET is intentionally NOT managed here — it signs session cookies
 *    and must stay in .env (changing it logs everyone out).
 *  - Secret values are never returned in full to the browser (see the admin
 *    route, which masks them).
 *
 * A short in-memory cache avoids a DB round-trip on every request.
 */
import { getPool, type RowDataPacket } from "@/lib/db";

export const CONFIG_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "APP_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ADMIN_EMAIL",
  "MOJEN_FEATURE_UID",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

/** Which keys hold secrets (masked in the admin UI, never returned in full). */
export const SECRET_KEYS = new Set<ConfigKey>([
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_SECRET",
]);

type Cache = { at: number; values: Partial<Record<ConfigKey, string>> };
const g = globalThis as unknown as { __serverCfg?: Cache };
const TTL_MS = 10_000;

async function loadDb(): Promise<Partial<Record<ConfigKey, string>>> {
  const out: Partial<Record<ConfigKey, string>> = {};
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      "SELECT `key`, `value` FROM settings WHERE `key` LIKE 'cfg_%'"
    );
    for (const r of rows) {
      const k = String(r.key).slice(4) as ConfigKey;
      if (CONFIG_KEYS.includes(k) && r.value != null && r.value !== "") out[k] = String(r.value);
    }
  } catch {
    /* table missing -> env only */
  }
  return out;
}

async function getCache(): Promise<Partial<Record<ConfigKey, string>>> {
  const now = Date.now();
  if (g.__serverCfg && now - g.__serverCfg.at < TTL_MS) return g.__serverCfg.values;
  const values = await loadDb();
  g.__serverCfg = { at: now, values };
  return values;
}

/** Read a config value: DB first, then process.env, then "". */
export async function getConfig(key: ConfigKey): Promise<string> {
  const db = await getCache();
  if (db[key]) return db[key] as string;
  return process.env[key] ?? "";
}

/** Read several at once. */
export async function getConfigs<K extends ConfigKey>(keys: K[]): Promise<Record<K, string>> {
  const db = await getCache();
  const out = {} as Record<K, string>;
  for (const k of keys) out[k] = (db[k] || process.env[k] || "") as string;
  return out;
}

/** Persist admin edits. Empty string clears the DB override (falls back to env). */
export async function setConfigs(patch: Partial<Record<ConfigKey, string>>): Promise<void> {
  const pool = getPool();
  for (const k of CONFIG_KEYS) {
    if (!(k in patch)) continue;
    const v = (patch[k] ?? "").trim();
    if (v === "") {
      await pool.query("DELETE FROM settings WHERE `key` = ?", [`cfg_${k}`]);
    } else {
      await pool.query(
        "INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
        [`cfg_${k}`, v]
      );
    }
  }
  g.__serverCfg = undefined; // invalidate cache
}

/** Mask a secret for display, e.g. "sk_test_51…uFQ". */
export function maskSecret(v: string): string {
  if (!v) return "";
  if (v.length <= 10) return "••••";
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}

/** Status view for the admin UI: whether set, source, and a safe preview. */
export async function configView(): Promise<
  Record<ConfigKey, { set: boolean; source: "db" | "env" | "none"; preview: string; secret: boolean }>
> {
  const db = await getCache();
  const out = {} as Record<ConfigKey, { set: boolean; source: "db" | "env" | "none"; preview: string; secret: boolean }>;
  for (const k of CONFIG_KEYS) {
    const secret = SECRET_KEYS.has(k);
    let source: "db" | "env" | "none" = "none";
    let value = "";
    if (db[k]) {
      source = "db";
      value = db[k] as string;
    } else if (process.env[k]) {
      source = "env";
      value = process.env[k] as string;
    }
    out[k] = {
      set: !!value && !/xxx|your-|change-this/i.test(value),
      source,
      preview: secret ? maskSecret(value) : value,
      secret,
    };
  }
  return out;
}
