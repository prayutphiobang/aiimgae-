import { getPool, type RowDataPacket } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { handle, HttpError } from "@/lib/api";
import { streamAsDownload } from "@/lib/download";

export const dynamic = "force-dynamic";

/**
 * GET /api/explore/code/:code/download
 * Streams a generation's file as an attachment (no new tab).
 * Visible if it's public (and the owner isn't in private mode) OR the caller
 * owns it — mirrors /api/explore/code/:code.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const code = String((await params).code ?? "").trim();
    if (!code) throw new HttpError("รหัสรูปไม่ถูกต้อง");

    const me = await getCurrentUser();
    // Admins may download any result; owners their own; everyone else public only.
    const base = "g.result_url IS NOT NULL AND g.status = 'success'";
    const publicRule = "(g.hidden = 0 AND g.is_public = 1 AND u.private_mode = 0 AND u.status = 'active')";
    const args: unknown[] = [code];
    let visibility = publicRule;
    if (me?.role === "admin") {
      visibility = "1=1";
    } else if (me) {
      visibility = `(${publicRule} OR g.user_id = ?)`;
      args.push(me.id);
    }

    const [[row]] = (await getPool().query<RowDataPacket[]>(
      `SELECT g.result_url, g.media_type
         FROM generations g JOIN users u ON u.id = g.user_id
        WHERE g.task_uid = ? AND ${base} AND ${visibility} LIMIT 1`,
      args
    )) as any;

    if (!row || !row.result_url) throw new HttpError("ไม่พบไฟล์ หรือถูกตั้งเป็นส่วนตัว", 404);
    return streamAsDownload(row.result_url, row.media_type, code);
  });
}
