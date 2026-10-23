/**
 * Node.js-only startup code (loaded from instrumentation.ts).
 * Starts a background sweeper that finishes/refunds generations even if
 * the user closed the browser before the job completed.
 */
import { syncPendingGenerations } from "@/lib/jobs";

const g = globalThis as unknown as { __jobSweeper?: NodeJS.Timeout };

if (!g.__jobSweeper) {
  let running = false;
  g.__jobSweeper = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await syncPendingGenerations(undefined, 50);
    } catch (e: any) {
      console.error("[jobs] sweeper error:", e?.message);
    } finally {
      running = false;
    }
  }, 20_000);
  console.log("[jobs] background sweeper started (every 20s)");
}
