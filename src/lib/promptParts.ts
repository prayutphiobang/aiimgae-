/**
 * Weighted prompt parts.
 *
 * Mojen takes text_0 / text_1 as string[] and runs on ComfyUI, where a phrase
 * weight is written as "(phrase:1.5)". Each part becomes one array element.
 */

export interface PromptPart {
  text: string;
  /** 0.1 – 5.0, one decimal. 1.0 means "no explicit weight". */
  weight: number;
}

export const WEIGHT_MIN = 0.1;
export const WEIGHT_MAX = 5;
export const WEIGHT_STEP = 0.1;
export const DEFAULT_WEIGHT = 1;

export function clampWeight(w: number): number {
  const n = Number.isFinite(w) ? w : DEFAULT_WEIGHT;
  return Math.round(Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, n)) * 10) / 10;
}

/**
 * Characters that would break the "(text:weight)" round-trip are removed,
 * so parsing a rendered prompt always gives back the same parts.
 */
export function sanitisePartText(raw: string): string {
  return raw.replace(/[(),:]/g, " ").replace(/\s+/g, " ").trim();
}

/** One part → "phrase" or "(phrase:1.5)" */
export function renderPart(p: PromptPart): string {
  const text = sanitisePartText(p.text);
  if (!text) return "";
  const w = clampWeight(p.weight);
  return w === DEFAULT_WEIGHT ? text : `(${text}:${w.toFixed(1)})`;
}

/** Parts → array for the Mojen API (empty parts dropped). */
export function renderParts(parts: PromptPart[]): string[] {
  return parts.map(renderPart).filter(Boolean);
}

/** Parts → single string for storage, search and display. */
export function partsToText(parts: PromptPart[]): string {
  return renderParts(parts).join(", ");
}

/** Stored text → parts, so a saved prompt can be edited again. */
export function textToParts(text: string | null | undefined): PromptPart[] {
  if (!text) return [];
  return text
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const m = chunk.match(/^\((.+):(\d+(?:\.\d+)?)\)$/);
      if (m) return { text: sanitisePartText(m[1]), weight: clampWeight(Number(m[2])) };
      return { text: sanitisePartText(chunk), weight: DEFAULT_WEIGHT };
    })
    .filter((p) => p.text.length > 0);
}

/** Accept either a parts array or a plain string from a request body. */
export function coercePromptInput(parts: unknown, fallbackText: unknown): PromptPart[] {
  if (Array.isArray(parts)) {
    return parts
      .map((p: any) => ({
        text: sanitisePartText(String(p?.text ?? "")),
        weight: clampWeight(Number(p?.weight ?? DEFAULT_WEIGHT)),
      }))
      .filter((p) => p.text.length > 0);
  }
  return textToParts(typeof fallbackText === "string" ? fallbackText : "");
}
