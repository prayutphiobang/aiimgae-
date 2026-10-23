import { requireUser } from "@/lib/auth";
import { handle, HttpError } from "@/lib/api";
import { getGenerationByTask, syncGeneration } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/** GET /api/task/:uid  Poll Mojen, persist status, auto-refund on failure. */
export async function GET(_req: Request, { params }: { params: Promise<{ uid: string }> }) {
  return handle(async () => {
    const { uid } = await params;
    const user = await requireUser();
    const gen = await getGenerationByTask(uid);
    if (!gen || (gen.user_id !== user.id && user.role !== "admin")) throw new HttpError("ไม่พบงานนี้", 404);
    const r = await syncGeneration(gen);
    return { uid, status: r.status, result_url: r.result_url, error: r.error };
  });
}
