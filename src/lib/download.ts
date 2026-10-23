import { HttpError } from "@/lib/api";

/**
 * Fetch a remote media file (from Mojen's CDN) on the server and return it as
 * an attachment Response. Forcing Content-Disposition makes the browser save
 * the file instead of opening the cross-origin URL in a new tab.
 */
export async function streamAsDownload(
  url: string,
  mediaType: string | null,
  baseName: string
): Promise<Response> {
  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) throw new HttpError("ดึงไฟล์ไม่สำเร็จ", 502);

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const isVideo = mediaType === "video" || contentType.startsWith("video/");
  const ext = isVideo
    ? "mp4"
    : contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
    ? "webp"
    : "jpg";

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", `attachment; filename="${baseName}.${ext}"`);
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  headers.set("Cache-Control", "private, max-age=0, no-store");

  return new Response(upstream.body, { status: 200, headers });
}
