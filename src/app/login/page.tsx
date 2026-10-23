"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/components/ui";

const OAUTH_ERRORS: Record<string, string> = {
  google_state: "เซสชันหมดอายุ กรุณาลองใหม่",
  google_config: "ยังไม่ได้ตั้งค่า Google OAuth",
  google_token: "แลกโทเคนกับ Google ไม่สำเร็จ",
  google_profile: "อ่านข้อมูลโปรไฟล์จาก Google ไม่สำเร็จ",
  google_failed: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ",
  banned: "บัญชีนี้ถูกระงับ กรุณาติดต่อผู้ดูแล",
};

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

/** Only allow same-site relative redirects. */
function safeNext(v: string | null) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/studio";
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, refresh, site, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(params.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const e = params.get("error");
    return e ? OAUTH_ERRORS[e] ?? "เข้าสู่ระบบไม่สำเร็จ" : null;
  });
  const [loading, setLoading] = useState(false);
  const next = safeNext(params.get("next"));

  useEffect(() => {
    if (!authLoading && user) router.replace(next);
  }, [authLoading, user, router, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        json: { email, password, displayName },
      });
      await refresh();
      router.replace(next);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-art">
        <Link href="/" className="brand" style={{ position: "absolute", top: 40, left: 48 }}>
          <span className="brand-mark">✦</span>
          {site.site_name}
        </Link>
        <h2>
          สร้างสรรค์ภาพที่ไม่เคยมีใคร<span className="grad-text">เห็นมาก่อน</span>
        </h2>
        <p style={{ color: "var(--text-2)", marginTop: 14, maxWidth: 420 }}>
          {site.site_tagline || "เครื่องมือสร้างภาพด้วย AI สำหรับทุกคน"}
        </p>
      </aside>

      <div className="auth-form">
        <div className="auth-box">
          <h1 style={{ marginBottom: 6 }}>{mode === "login" ? "ยินดีต้อนรับกลับ 👋" : "สร้างบัญชีใหม่"}</h1>
          <p className="muted" style={{ marginBottom: 26 }}>
            {mode === "login" ? "เข้าสู่ระบบเพื่อสร้างภาพต่อ" : "สมัครวันนี้รับ credit ฟรีทันที"}
          </p>

          <a href="/api/auth/google" className="btn white lg block">
            <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95L3.98 7.28C4.68 5.16 6.66 3.58 9 3.58z" />
            </svg>
            ดำเนินการต่อด้วย Google
          </a>

          <div className="divider">หรือใช้อีเมล</div>

          <form className="stack" onSubmit={submit}>
            {mode === "register" && (
              <div className="field">
                <label className="label" htmlFor="dn">ชื่อที่แสดง</label>
                <input id="dn" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ชื่อของคุณ" />
              </div>
            )}
            <div className="field">
              <label className="label" htmlFor="em">อีเมล</label>
              <input
                id="em"
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="pw">รหัสผ่าน</label>
              <div className="input-group">
                <input
                  id="pw"
                  className="input"
                  type={showPw ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={mode === "register" ? 6 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "อย่างน้อย 6 ตัวอักษร" : "••••••••"}
                />
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ position: "absolute", right: 4, top: 5 }}
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {error && <div className="form-error" role="alert">{error}</div>}

            <button className="btn primary lg block" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>
          </form>

          <p className="center small muted" style={{ marginTop: 22 }}>
            {mode === "login" ? "ยังไม่มีบัญชี? " : "มีบัญชีอยู่แล้ว? "}
            <button
              type="button"
              className="btn ghost sm"
              style={{ color: "var(--primary)", padding: "0 4px" }}
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
            >
              {mode === "login" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
