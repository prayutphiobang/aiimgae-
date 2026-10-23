/**
 * Resolve the public base URL that external services (Mojen) can reach.
 *
 * Order:
 *  1. A running cloudflared quick tunnel (its URL changes on every restart, so it is
 *     read live from cloudflared's local metrics endpoint instead of .env).
 *  2. APP_URL from .env.
 */
const METRICS = process.env.CLOUDFLARED_METRICS_URL ?? "http://127.0.0.1:20241";
const CACHE_MS = 15_000;

let cache: { at: number; url: string | null } | null = null;

async function quickTunnelUrl(): Promise<string | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.url;
  let url: string | null = null;
  try {
    const res = await fetch(`${METRICS}/quicktunnel`, { cache: "no-store", signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const host = String((await res.json())?.hostname ?? "").trim();
      if (/^[a-z0-9-]+\.trycloudflare\.com$/i.test(host)) url = `https://${host}`;
    }
  } catch {
    /* cloudflared not running */
  }
  cache = { at: Date.now(), url };
  return url;
}

export async function publicBaseUrl(): Promise<string> {
  const tunnel = await quickTunnelUrl();
  if (tunnel) return tunnel;
  const { getConfig } = await import("@/lib/serverConfig");
  const appUrl = (await getConfig("APP_URL")) || "http://localhost:3000";
  return appUrl.replace(/\/+$/, "");
}

/** Is a URL actually downloadable from the internet right now? */
export async function isReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(8000) });
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}
