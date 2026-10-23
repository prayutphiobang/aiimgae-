/**
 * Runs once when the Next.js server starts.
 * Node-only code lives in instrumentation-node.ts so it is never bundled
 * for the Edge runtime (mysql2 depends on Node built-ins).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
