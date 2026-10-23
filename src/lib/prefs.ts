/** Per-user UI preferences (stored as JSON in users.prefs). */
export interface Prefs {
  theme: "dark" | "light";
  coin_popup: boolean; // confirm before spending credit on a generation
  delete_popup: boolean; // confirm before deleting a photo
}

export const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  coin_popup: true,
  delete_popup: true,
};

export function parsePrefs(raw: string | null | undefined): Prefs {
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const v = JSON.parse(raw);
    return {
      theme: v.theme === "light" ? "light" : "dark",
      coin_popup: v.coin_popup !== false,
      delete_popup: v.delete_popup !== false,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/** Merge a partial update from the client into current prefs. */
export function mergePrefs(current: Prefs, patch: Record<string, unknown>): Prefs {
  return {
    theme: patch.theme === "light" || patch.theme === "dark" ? patch.theme : current.theme,
    coin_popup: typeof patch.coin_popup === "boolean" ? patch.coin_popup : current.coin_popup,
    delete_popup: typeof patch.delete_popup === "boolean" ? patch.delete_popup : current.delete_popup,
  };
}
