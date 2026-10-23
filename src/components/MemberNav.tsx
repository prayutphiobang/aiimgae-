"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { Avatar } from "./ui";
import { num } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const LINKS = [
  { href: "/studio", label: "สร้างภาพ", icon: "✨" },
  { href: "/explore", label: "สำรวจ", icon: "🔍" },
  { href: "/features", label: "โมเดล", icon: "🧩" },
  { href: "/gallery", label: "แกลเลอรี", icon: "🖼️" },
  { href: "/wallet", label: "กระเป๋าเงิน", icon: "💳" },
];

export default function MemberNav() {
  const { user, site, logout, loading } = useAuth();
  const { lang, setLang } = useI18n();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => setOpen(false), [path]);

  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <>
      {site.maintenance_mode && (
        <div className="banner warning">🛠️ ระบบอยู่ระหว่างปิดปรับปรุง การสร้างภาพจะใช้งานไม่ได้ชั่วคราว</div>
      )}
      {site.announcement && !site.maintenance_mode && <div className="banner">📢 {site.announcement}</div>}

      <header className="topnav">
        <div className="topnav-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">✦</span>
            {site.site_name}
          </Link>

          {user && (
            <nav className="navlinks" aria-label="menu">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={`navlink ${isActive(l.href) ? "active" : ""}`}>
                  <span aria-hidden>{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="nav-right">
            <button
              className="lang-toggle"
              onClick={() => setLang(lang === "th" ? "en" : "th")}
              title={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
              aria-label="language"
            >
              {lang === "th" ? "🇹🇭 TH" : "🇬🇧 EN"}
            </button>
            {loading ? null : user ? (
              <>
                <Link href="/wallet" className="credit-chip" title="เติม credit">
                  <span className="coin" aria-hidden />
                  {num(user.credit_balance)}
                  <span className="plus" aria-hidden>
                    +
                  </span>
                  <span className="sr-only">credit — เติมเงิน</span>
                </Link>
                <div className="menu" ref={ref}>
                  <button
                    className="btn ghost icon"
                    style={{ width: 40, height: 40, borderRadius: "50%", padding: 0 }}
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-label="เมนูบัญชี"
                  >
                    <Avatar src={user.avatar_url} name={user.display_name || user.email} />
                  </button>
                  {open && (
                    <div className="menu-pop" role="menu">
                      <div className="who">
                        <div style={{ fontWeight: 700 }} className="truncate">
                          {user.display_name || user.email.split("@")[0]}
                        </div>
                        <div className="xs muted truncate">{user.email}</div>
                      </div>
                      <Link href="/account" className="menu-item" role="menuitem">
                        👤 บัญชีของฉัน
                      </Link>
                      <Link href="/settings" className="menu-item" role="menuitem">
                        ⚙️ การตั้งค่า
                      </Link>
                      <Link href="/wallet" className="menu-item" role="menuitem">
                        💳 เติมเงิน / ประวัติ
                      </Link>
                      <Link href="/help" className="menu-item" role="menuitem">
                        💬 ศูนย์ช่วยเหลือ
                      </Link>
                      {user.role === "admin" && (
                        <Link href="/admin" className="menu-item" role="menuitem">
                          🛡️ ระบบหลังบ้าน
                        </Link>
                      )}
                      <button className="menu-item" role="menuitem" onClick={logout}>
                        ↩️ ออกจากระบบ
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="btn ghost">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/login?mode=register" className="btn primary">
                  เริ่มใช้งานฟรี
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {user && (
        <nav className="mobile-nav" aria-label="mobile menu">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""}>
              <span aria-hidden>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
