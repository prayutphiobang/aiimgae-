import { getPool, type RowDataPacket } from "@/lib/db";
import { getTask } from "@/lib/mojen";
import { adjustCredits } from "@/lib/credits";

export const FINAL_STATUSES = new Set(["success", "failed", "error"]);

/** Jobs still pending after this long are failed and refunded. */
const JOB_TIMEOUT_MS = 30 * 60 * 1000;

export interface PendingGen extends RowDataPacket {
  id: number;
  user_id: number;
  task_uid: string | null;
  status: string;
  result_url: string | null;
  thumbnail_url: string | null;
  media_type: string;
  error: string | null;
  cost_credit: number;
  refunded: number;
  created_at: Date;
}

export interface SyncResult {
  id: number;
  task_uid: string | null;
  status: string;
  result_url: string | null;
  thumbnail_url: string | null;
  media_type: string;
  error: string | null;
}

/** Guess whether a result URL is a video (Mojen returns video/mp4 for video features). */
function mediaTypeOf(url: string | null): "image" | "video" {
  if (url && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return "video";
  return "image";
}

/** Refund a failed generation exactly once (safe under concurrent callers). */
async function refundOnce(gen: PendingGen, note: string) {
  if (gen.refunded || gen.cost_credit <= 0) return;
  const [upd] = (await getPool().execute("UPDATE generations SET refunded = 1 WHERE id = ? AND refunded = 0", [
    gen.id,
  ])) as any;
  if (upd.affectedRows === 1) {
    await adjustCredits({
      userId: gen.user_id,
      delta: gen.cost_credit,
      type: "refund",
      refType: "generation",
      refId: String(gen.id),
      note,
    });
  }
}

/**
 * Bring one generation up to date with Mojen.
 * Final jobs are returned as-is; failures are refunded; stuck jobs time out.
 */
export async function syncGeneration(gen: PendingGen): Promise<SyncResult> {
  const pool = getPool();
  const base = (s: Partial<SyncResult> = {}): SyncResult => ({
    id: gen.id,
    task_uid: gen.task_uid,
    status: gen.status,
    result_url: gen.result_url,
    thumbnail_url: gen.thumbnail_url,
    media_type: gen.media_type,
    error: gen.error,
    ...s,
  });

  if (FINAL_STATUSES.has(gen.status)) return base();

  const age = Date.now() - new Date(gen.created_at).getTime();

  // Never got a task uid (request crashed mid-way) or stuck too long → fail + refund.
  if (!gen.task_uid || age > JOB_TIMEOUT_MS) {
    if (!gen.task_uid && age < 2 * 60 * 1000) return base(); // still being submitted
    const error = "หมดเวลารอผลจากผู้ให้บริการ";
    await pool.execute("UPDATE generations SET status = 'failed', error = ? WHERE id = ?", [error, gen.id]);
    await refundOnce(gen, "หมดเวลา — คืน credit อัตโนมัติ");
    return base({ status: "failed", error });
  }

  const task = await getTask(gen.task_uid);
  const status = task.status ?? "pending";
  const resultUrl = task.results?.result_url ?? null;
  const thumbUrl = task.results?.thumbnail_url ?? null;
  const mediaType = mediaTypeOf(resultUrl);
  const error = task.errors?.length ? task.errors.join("; ").slice(0, 1000) : null;

  if (
    status !== gen.status ||
    resultUrl !== gen.result_url ||
    thumbUrl !== gen.thumbnail_url ||
    error !== gen.error
  ) {
    await pool.execute(
      "UPDATE generations SET status = ?, result_url = ?, thumbnail_url = ?, media_type = ?, error = ? WHERE id = ?",
      [status, resultUrl, thumbUrl, mediaType, error, gen.id]
    );
  }
  if (status === "failed" || status === "error") await refundOnce(gen, "สร้างภาพล้มเหลว");

  return base({ status, result_url: resultUrl, thumbnail_url: thumbUrl, media_type: mediaType, error });
}

const PENDING_COLS =
  "id, user_id, task_uid, status, result_url, thumbnail_url, media_type, error, cost_credit, refunded, created_at";

/** Sync every unfinished job (optionally for one user). Errors on one job don't stop the rest. */
export async function syncPendingGenerations(userId?: number, limit = 50): Promise<SyncResult[]> {
  const where = ["status NOT IN ('success','failed','error')"];
  const args: unknown[] = [];
  if (userId) {
    where.push("user_id = ?");
    args.push(userId);
  }
  const [rows] = await getPool().query<PendingGen[]>(
    `SELECT ${PENDING_COLS} FROM generations WHERE ${where.join(" AND ")} ORDER BY id ASC LIMIT ?`,
    [...args, limit]
  );
  const out: SyncResult[] = [];
  for (const g of rows) {
    try {
      out.push(await syncGeneration(g));
    } catch (e: any) {
      console.error(`[jobs] sync #${g.id} failed:`, e?.message);
      out.push({
        id: g.id,
        task_uid: g.task_uid,
        status: g.status,
        result_url: g.result_url,
        thumbnail_url: g.thumbnail_url,
        media_type: g.media_type,
        error: g.error,
      });
    }
  }
  return out;
}

export async function getGenerationByTask(uid: string): Promise<PendingGen | null> {
  const [rows] = await getPool().query<PendingGen[]>(
    `SELECT ${PENDING_COLS} FROM generations WHERE task_uid = ? LIMIT 1`,
    [uid]
  );
  return rows[0] ?? null;
}
