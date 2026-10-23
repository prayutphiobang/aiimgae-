import { getPool, type ResultSetHeader } from "@/lib/db";
import { startGeneration, randomSeed, SEED_MIN, SEED_MAX } from "@/lib/mojen";
import { requireUser } from "@/lib/auth";
import { adjustCredits } from "@/lib/credits";
import { getModel, parseExtraParams } from "@/lib/models";
import { getSettings } from "@/lib/settings";

import { handle, readJson, HttpError } from "@/lib/api";
import { coercePromptInput, partsToText, renderParts } from "@/lib/promptParts";

import { publicBaseUrl, isReachable } from "@/lib/publicUrl";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

/** If the URL points at one of our own uploads, return its file name. */
function ownUploadName(raw: string): string | null {
  try {
    const m = new URL(raw).pathname.match(/^\/uploads\/([A-Za-z0-9_.-]+)$/);
    return m && existsSync(join(process.cwd(), "public", "uploads", m[1])) ? m[1] : null;
  } catch {
    return null;
  }
}

/**
 * Our uploads are saved with whatever public URL was current at upload time.
 * Tunnels change URL on restart, so rebuild the link from the live public base.
 */
async function normaliseOwnUpload(raw: string): Promise<string> {
  const name = ownUploadName(raw);
  return name ? `${await publicBaseUrl()}/uploads/${name}` : raw;
}

/** True for URLs that an external service cannot reach (localhost / LAN). */
function isPrivateUrl(raw: string): boolean {
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return true;
  }
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "::1" ||
    host === "0.0.0.0" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host)
  );
}

/**
 * POST /api/generate  { modelId, prompt, seed?, imgRef? }
 * auth → validate against model rules → charge → call Mojen → refund on failure.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const settings = await getSettings();
    if (settings.maintenance_mode && user.role !== "admin") {
      throw new HttpError("ระบบปิดปรับปรุงชั่วคราว กรุณาลองใหม่ภายหลัง", 503);
    }

    const body = await readJson(req);
    // Prompts arrive as weighted parts (chips); plain strings still work.
    const promptParts = coercePromptInput(body.promptParts, body.prompt);
    const negativeParts = coercePromptInput(body.negativeParts, body.negativePrompt);
    const prompt = partsToText(promptParts);
    const negativePrompt = partsToText(negativeParts);
    const model = await getModel(Number(body.modelId));
    if (!model || !model.active) throw new HttpError("ไม่พบโมเดลนี้หรือถูกปิดใช้งาน", 404);

    const notPublicMsg =
      user.role === "admin"
        ? "รูปอ้างอิงยังเปิดจากอินเทอร์เน็ตไม่ได้ (tunnel ไม่ได้รัน หรือ APP_URL ไม่ใช่โดเมนสาธารณะ) — เปิด cloudflared แล้วลองใหม่"
        : "ระบบอัปโหลดรูปไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ภายหลัง หรือใช้ URL รูปจากอินเทอร์เน็ตแทน";

    // Normalise + validate a reference image: own uploads get rebuilt to the live
    // public URL and verified reachable; external URLs are sanity-checked.
    async function resolveRef(raw: string | null): Promise<string | null> {
      if (!raw) return null;
      const trimmed = raw.trim();
      if (!trimmed) return null;
      const normalised = await normaliseOwnUpload(trimmed);
      if (!/^https?:\/\//i.test(normalised)) throw new HttpError("URL รูปไม่ถูกต้อง");
      if (isPrivateUrl(normalised)) throw new HttpError(notPublicMsg);
      if (ownUploadName(trimmed) && !(await isReachable(normalised))) throw new HttpError(notPublicMsg);
      return normalised;
    }

    const imgRef = await resolveRef(body.imgRef ? String(body.imgRef) : null);
    const imgRef2 = model.supports_image2 ? await resolveRef(body.imgRef2 ? String(body.imgRef2) : null) : null;

    if (model.requires_image && !imgRef) throw new HttpError(`กรุณาใส่${model.image_label ?? "รูปอ้างอิง"}`);
    if (!model.supports_image && imgRef) throw new HttpError("โมเดลนี้ไม่รองรับรูปอ้างอิง");
    if (model.requires_image2 && !imgRef2) throw new HttpError(`กรุณาใส่${model.image2_label ?? "รูปที่สอง"}`);
    if (model.supports_prompt && !prompt && !imgRef) throw new HttpError("กรุณาใส่ prompt");
    if (prompt.length > model.prompt_max_len)
      throw new HttpError(`prompt ยาวเกินไป (สูงสุด ${model.prompt_max_len} ตัวอักษร)`);
    const negative = model.supports_negative ? negativePrompt : "";
    if (negative.length > model.prompt_max_len)
      throw new HttpError(`negative prompt ยาวเกินไป (สูงสุด ${model.prompt_max_len} ตัวอักษร)`);

    let seed = Number(body.seed);
    if (!Number.isInteger(seed) || seed < SEED_MIN || seed > SEED_MAX) seed = randomSeed();

    const price = model.sell_price_credit;
    try {
      await adjustCredits({
        userId: user.id,
        delta: -price,
        type: "spend",
        refType: "generation",
        note: model.name,
      });
    } catch (e: any) {
      throw new HttpError(e?.message ?? "Credit ไม่เพียงพอ", 402);
    }

    const pool = getPool();
    const [ins] = await pool.execute<ResultSetHeader>(
      `INSERT INTO generations (user_id, model_id, seed, prompt, negative_prompt, img_ref, img_ref2, status, media_type, is_public, cost_credit, cost_coin)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, ?, ?)`,
      [user.id, model.id, seed, prompt, negative || null, imgRef, imgRef2, model.output_type, price, model.cost_coin]
    );
    const generationId = ins.insertId;

    try {
      // Each weighted part is one element of the string[] the API expects.
      const params = {
        seed,
        text_0: model.supports_prompt ? renderParts(promptParts) : [],
        img_ref_0: imgRef,
        ...(model.supports_negative ? { text_1: renderParts(negativeParts) } : {}),
        ...(model.supports_image2 ? { img_ref_1: imgRef2 } : {}),
      };
      const task = await startGeneration(params, model.feature_uid, parseExtraParams(model.extra_params));
      const status = task.status ?? "pending";
      const resultUrl = task.results?.result_url ?? null;
      const thumbUrl = task.results?.thumbnail_url ?? null;
      await pool.execute(
        "UPDATE generations SET task_uid = ?, status = ?, result_url = ?, thumbnail_url = ? WHERE id = ?",
        [task.uid ?? null, status, resultUrl, thumbUrl, generationId]
      );
      return { id: generationId, task_uid: task.uid, seed, status, result_url: resultUrl, charged: price };
    } catch (mojenErr: any) {
      await adjustCredits({
        userId: user.id,
        delta: price,
        type: "refund",
        refType: "generation",
        refId: String(generationId),
        note: "ส่งคำขอไม่สำเร็จ",
      });
      await pool.execute("UPDATE generations SET status = 'failed', error = ?, refunded = 1 WHERE id = ?", [
        String(mojenErr?.message ?? "mojen error").slice(0, 1000),
        generationId,
      ]);
      throw new HttpError(`สร้างภาพไม่สำเร็จ (คืน credit แล้ว): ${mojenErr?.message ?? ""}`, 502);
    }
  });
}
