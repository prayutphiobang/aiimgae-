/**
 * Thin client for the Mojen AI image generation API.
 * Docs: see apidoc.md
 */

import { nextKey, penalizeKey, hasAnyKey } from "@/lib/mojenKeys";
import { getConfig } from "@/lib/serverConfig";

const BASE = process.env.MOJEN_API_BASE ?? "https://api.mojen.ai/api/v1";

/** Statuses where switching to another API key is worth retrying. */
const ROTATE_STATUSES = new Set([401, 402, 429]);

export const SEED_MIN = 1_000_000;
export const SEED_MAX = 999_999_999_999_999;

export interface GenParams {
  seed: number;
  /** positive prompt, sent as string[] (text_0) */
  text_0: string[];
  /** negative prompt, sent as string[] (text_1) — only for models that support it */
  text_1?: string[];
  /** optional reference image URL (img_ref_0) */
  img_ref_0: string | null;
  /** optional second reference image URL (img_ref_1), e.g. clothing for try-on */
  img_ref_1?: string | null;
}

export interface MojenTask {
  uid: string;
  created_date?: string;
  status: string; // e.g. "pending" | "processing" | "success" | "failed"
  feature_uid?: string;
  params?: Record<string, unknown>;
  results?: { result_url?: string; thumbnail_url?: string } | null;
  errors?: string[] | null;
  api_key_id?: string;
}

function headersFor(key: string) {
  return {
    "Mojen-Api-Key": key,
    "Content-Type": "application/json",
  };
}

/**
 * Perform a Mojen request, rotating through API keys on rate-limit / quota /
 * auth errors so one exhausted key doesn't take the whole system down.
 */
async function mojenFetch(path: string, init: Omit<RequestInit, "headers">): Promise<string> {
  if (!(await hasAnyKey())) throw new Error("ยังไม่ได้ตั้งค่า Mojen API key (เพิ่มได้ที่หน้า admin หรือใน .env)");

  const tried = new Set<string>();
  let lastStatus = 0;
  let lastText = "";

  // Try each distinct key at most once per request.
  for (let attempt = 0; attempt < 20; attempt++) {
    const key = await nextKey(tried);
    if (!key) break;
    tried.add(key);

    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: headersFor(key),
      cache: "no-store",
    });
    const text = await res.text();
    if (res.ok) return text;

    lastStatus = res.status;
    lastText = text;
    if (ROTATE_STATUSES.has(res.status)) {
      // This key is limited/out of quota/invalid — cool it down and try another.
      penalizeKey(key, res.status);
      console.warn(`[mojen] key rotated after HTTP ${res.status} (${tried.size} tried)`);
      continue;
    }
    // Non-rotatable error (e.g. 400/404/500) — stop and report.
    throw new Error(errorMessage(res.status, text));
  }

  // Every key failed with a rotatable error.
  throw new Error(errorMessage(lastStatus || 429, lastText));
}

/** Generate a random seed within the allowed range. */
export function randomSeed(): number {
  return Math.floor(Math.random() * (SEED_MAX - SEED_MIN + 1)) + SEED_MIN;
}

/**
 * Kick off a generation on a given Mojen feature (model).
 * extraParams are merged into the params object (for models with additional keys).
 */
export async function startGeneration(
  params: GenParams,
  featureUid?: string,
  extraParams: Record<string, unknown> = {}
): Promise<MojenTask> {
  const uid = featureUid || (await getConfig("MOJEN_FEATURE_UID"));
  if (!uid) {
    throw new Error("feature_uid ของโมเดลไม่ได้ตั้งค่า");
  }
  featureUid = uid;
  const text = await mojenFetch(`/gen/${encodeURIComponent(featureUid)}`, {
    method: "POST",
    body: JSON.stringify({ params: { ...extraParams, ...params } }),
  });
  return safeParse(text) as MojenTask;
}

/**
 * Poll the status of a task by its uid.
 */
export async function getTask(uid: string): Promise<MojenTask> {
  const text = await mojenFetch(`/task/${encodeURIComponent(uid)}`, { method: "GET" });
  return safeParse(text) as MojenTask;
}

function safeParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Turn a Mojen error response into a short readable message.
 * Mojen sometimes returns nginx HTML pages, which must never reach the UI as-is.
 * The raw response is logged on the server for debugging.
 */
function errorMessage(status: number, text: string): string {
  const data = safeParse(text);
  const fromJson =
    data && (data.message || data.error || (Array.isArray(data.errors) && data.errors.join("; ")));
  console.error(`[mojen] HTTP ${status}:`, text.slice(0, 500));
  if (fromJson && typeof fromJson === "string") return fromJson.slice(0, 300);
  switch (status) {
    case 401:
      return "Mojen API key ไม่ถูกต้อง (ผู้ดูแลระบบต้องตรวจสอบ MOJEN_API_KEY)";
    case 402:
      return "coin ในบัญชี Mojen ไม่พอ (ผู้ดูแลระบบต้องเติม coin)";
    case 403:
      return "Mojen ปฏิเสธคำขอ (403) — ตรวจสอบสิทธิ์ของ API key หรือโมเดลนี้";
    case 404:
      return "ไม่พบโมเดลนี้บน Mojen — ตรวจสอบ feature_uid";
    case 429:
      return "มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่";
    default:
      return status >= 500 ? `เซิร์ฟเวอร์ Mojen ขัดข้อง (HTTP ${status})` : `Mojen ตอบกลับผิดพลาด (HTTP ${status})`;
  }
}
