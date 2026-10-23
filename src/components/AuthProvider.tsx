"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface Me {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  credit_balance: number;
  private_mode: boolean;
  prefs: { theme: "dark" | "light"; coin_popup: boolean; delete_popup: boolean };
  has_password: boolean;
  has_google: boolean;
  created_at: string;
}

export interface SiteSettings {
  site_name: string;
  site_tagline: string;
  announcement: string;
  support_contact: string;
  maintenance_mode: boolean;
  min_topup_thb: number;
  thb_per_credit: number;
}

const DEFAULT_SITE: SiteSettings = {
  site_name: "AI Image Studio",
  site_tagline: "",
  announcement: "",
  support_contact: "",
  maintenance_mode: false,
  min_topup_thb: 20,
  thb_per_credit: 1,
};

interface Ctx {
  user: Me | null;
  site: SiteSettings;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<Ctx>({
  user: null,
  site: DEFAULT_SITE,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SITE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const u = (await res.json()).user ?? null;
      setUser(u);
      // Apply the chosen theme on the document.
      if (u?.prefs?.theme) {
        document.documentElement.dataset.theme = u.prefs.theme;
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  }, []);

  useEffect(() => {
    refresh();
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => s && !s.error && setSite({ ...DEFAULT_SITE, ...s }))
      .catch(() => {});
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, site, loading, refresh, logout }}>{children}</AuthContext.Provider>
  );
}
