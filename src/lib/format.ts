/** Client-safe formatting helpers. */

export function num(n: number | string | null | undefined, digits = 0): string {
  const v = Number(n ?? 0);
  return v.toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function thb(n: number | string | null | undefined, digits = 2): string {
  return `฿${num(n, digits)}`;
}

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function dateTime(v: string | Date | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export function dateOnly(v: string | Date | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("th-TH", { dateStyle: "medium" });
}

export function timeAgo(v: string | Date | null | undefined): string {
  if (!v) return "-";
  const s = Math.floor((Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} วันที่แล้ว`;
  return dateOnly(v);
}

export function initials(nameOrEmail: string | null | undefined): string {
  const s = (nameOrEmail ?? "?").trim();
  return (s[0] ?? "?").toUpperCase();
}

/**
 * Best URL to show as a still preview.
 * Video results carry a separate PNG thumbnail; using result_url would try to
 * render an .mp4 inside <img> and show a broken image.
 */
export function previewUrl(item: {
  result_url?: string | null;
  thumbnail_url?: string | null;
  media_type?: string | null;
}): string | null {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.media_type === "video") return null; // video with no thumbnail yet
  return item.result_url ?? null;
}

export function isVideo(item: { media_type?: string | null; result_url?: string | null }): boolean {
  return item.media_type === "video" || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(item.result_url ?? "");
}

export const GEN_STATUS: Record<string, { label: string; cls: string }> = {
  success: { label: "สำเร็จ", cls: "success" },
  failed: { label: "ล้มเหลว", cls: "danger" },
  error: { label: "ล้มเหลว", cls: "danger" },
};
export function genStatus(s: string) {
  return GEN_STATUS[s] ?? { label: "กำลังสร้าง", cls: "info" };
}
export function isFinal(s: string) {
  return s === "success" || s === "failed" || s === "error";
}

export const TX_TYPE: Record<string, { label: string; cls: string }> = {
  topup: { label: "เติมเงิน", cls: "success" },
  spend: { label: "ใช้งาน", cls: "" },
  refund: { label: "คืน credit", cls: "info" },
  adjust: { label: "ปรับโดยแอดมิน", cls: "warning" },
  bonus: { label: "โบนัส", cls: "success" },
};

export const PAY_STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "ชำระแล้ว", cls: "success" },
  pending: { label: "รอชำระ", cls: "warning" },
  failed: { label: "ไม่สำเร็จ", cls: "danger" },
};
