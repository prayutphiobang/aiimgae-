/**
 * Mojen API key rotation.
 *
 * Keys come from two places (merged, de-duplicated, DB first):
 *   1. The database (settings key `mojen_api_keys`, a JSON array) — managed via
 *      the admin UI, no server restart needed.
 *   2. .env: MOJEN_API_KEY (comma/space separated) + MOJEN_API_KEY_2..N.
 *
 * We spread load round-robin and, when a key hits a rate limit (429), runs out
 * of coin (402) or is rejected (401), we cool it down and try the next key.
 *
 * Cooldowns + the loaded key list live on globalThis so they survive Next.js
 * hot-reload within one server process.
 */
import { getPool, type RowDataPacket } from "@/lib/db";

export interface StoredKey {
  key: string;
  enabled: boolean;
}

type KeyState = {
  key: string;
  /** epoch ms until which this key should not be used (0 = available) */
  cooldownUntil: number;
};

type Store = {
  keys: KeyState[];
  cursor: number;
  loadedAt: number;
  snapshot: string;
};

const g = globalThis as unknown as { __mojenKeys?: Store };
const TTL_MS = 15_000; // refresh the key list from DB at most this often

/** Keys from .env: MOJEN_API_KEY (comma/space separated) + MOJEN_API_KEY_N. */
function envKeys(): string[] {
  const out: string[] = [];
  for (const part of (process.env.MOJEN_API_KEY ?? "").split(/[\s,]+/)) {
    const k = part.trim();
    if (k) out.push(k);
  }
  for (let i = 1; i <= 20; i++) {
    const v = (process.env[`MOJEN_API_KEY_${i}`] ?? "").trim();
    if (v) out.push(v);
  }
  return out;
}

/** Read enabled keys stored in the settings table (JSON array). */
async function dbKeys(): Promise<string[]> {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      "SELECT `value` FROM settings WHERE `key` = 'mojen_api_keys' LIMIT 1"
    );
    const raw = rows[0]?.value;
    if (!raw) return [];
    const arr = JSON.parse(raw) as StoredKey[];
    if (!Array.isArray(arr)) return [];
    return arr.filter((k) => k && k.enabled !== false && typeof k.key === "string" && k.key.trim()).map((k) => k.key.trim());
  } catch {
    return [];
  }
}

/** Full stored list (including disabled) for the admin UI. */
export async function listStoredKeys(): Promise<StoredKey[]> {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      "SELECT `value` FROM settings WHERE `key` = 'mojen_api_keys' LIMIT 1"
    );
    const raw = rows[0]?.value;
    if (!raw) return [];
    const arr = JSON.parse(raw) as StoredKey[];
    return Array.isArray(arr) ? arr.filter((k) => k && typeof k.key === "string") : [];
  } catch {
    return [];
  }
}

/** Persist the stored key list and invalidate the in-memory cache. */
export async function saveStoredKeys(keys: StoredKey[]): Promise<void> {
  const clean = keys
    .filter((k) => typeof k.key === "string" && k.key.trim())
    .map((k) => ({ key: k.key.trim(), enabled: k.enabled !== false }));
  await getPool().query(
    "INSERT INTO settings (`key`, `value`) VALUES ('mojen_api_keys', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
    [JSON.stringify(clean)]
  );
  g.__mojenKeys = undefined; // force reload on next use
}

/** Build/refresh the in-memory store from DB + env, preserving cooldowns. */
async function getStore(): Promise<Store> {
  const now = Date.now();
  if (g.__mojenKeys && now - g.__mojenKeys.loadedAt < TTL_MS) return g.__mojenKeys;

  const merged = Array.from(new Set([...(await dbKeys()), ...envKeys()]));
  const snapshot = merged.join("|");

  // Preserve cooldowns for keys that still exist.
  const prev = g.__mojenKeys;
  const keys: KeyState[] = merged.map((key) => {
    const old = prev?.keys.find((k) => k.key === key);
    return { key, cooldownUntil: old?.cooldownUntil ?? 0 };
  });

  g.__mojenKeys = {
    keys,
    cursor: prev && prev.snapshot === snapshot ? prev.cursor : 0,
    loadedAt: now,
    snapshot,
  };
  return g.__mojenKeys;
}

export async function hasAnyKey(): Promise<boolean> {
  return (await getStore()).keys.length > 0;
}

export async function keyCount(): Promise<number> {
  return (await getStore()).keys.length;
}

/**
 * Pick the next usable key (round-robin, skipping keys on cooldown).
 * `exclude` lets a retry avoid keys already tried in the same request.
 */
export async function nextKey(exclude: Set<string> = new Set()): Promise<string | null> {
  const store = await getStore();
  const n = store.keys.length;
  if (n === 0) return null;
  const now = Date.now();

  for (let i = 0; i < n; i++) {
    const idx = (store.cursor + i) % n;
    const ks = store.keys[idx];
    if (ks.cooldownUntil <= now && !exclude.has(ks.key)) {
      store.cursor = (idx + 1) % n;
      return ks.key;
    }
  }
  // Fallback: least-cooled-down key not excluded.
  let best: KeyState | null = null;
  for (const ks of store.keys) {
    if (exclude.has(ks.key)) continue;
    if (!best || ks.cooldownUntil < best.cooldownUntil) best = ks;
  }
  return best?.key ?? null;
}

/** Put a key on cooldown after a limit/quota/auth error. */
export function penalizeKey(key: string, status: number): void {
  const store = g.__mojenKeys;
  if (!store) return;
  const ks = store.keys.find((k) => k.key === key);
  if (!ks) return;
  const ms = status === 402 ? 10 * 60_000 : status === 401 ? 30 * 60_000 : 60_000;
  ks.cooldownUntil = Math.max(ks.cooldownUntil, Date.now() + ms);
}

function mask(key: string): string {
  return key.length > 10 ? `${key.slice(0, 6)}…${key.slice(-4)}` : "••••";
}

/** Masked status list for the admin UI (never exposes full keys). */
export async function keyStatuses(): Promise<
  { masked: string; available: boolean; cooldownUntil: number }[]
> {
  const now = Date.now();
  return (await getStore()).keys.map((k) => ({
    masked: mask(k.key),
    available: k.cooldownUntil <= now,
    cooldownUntil: k.cooldownUntil,
  }));
}

export { mask as maskKey };
