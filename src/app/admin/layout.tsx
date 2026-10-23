"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/ui";

const NAV = [
  { group: "ภาพรวม", items: [{ href: "/admin", label: "แดชบอร์ด", icon: "📊", exact: true }, { href: "/admin/reports", label: "รายงานกำไร", icon: "📈" }] },
  {
    group: "จัดการ",
    items: [
      { href: "/admin/models", label: "โมเดล & ราคา", icon: "🧩" },
      { href: "/admin/packages", label: "แพ็กเกจเติมเงิน", icon: "📦" },
      { href: "/admin/users", label: "ผู้ใช้งาน", icon: "👥" },
    ],
  },
  {
    group: "ธุรกรรม",
    items: [
      { href: "/admin/gallery", label: "แกลเลอรีรวม", icon: "🏞️" },
      { href: "/admin/generations", label: "งานสร้างภาพ", icon: "🖼️" },
      { href: "/admin/payments", label: "การชำระเงิน", icon: "💳" },
    ],
  },
  {
    group: "ระบบ",
    items: [
      { href: "/admin/support", label: "ศูนย์ช่วยเหลือ", icon: "💬" },
      { href: "/admin/settings", label: "ตั้งค่าระบบ", icon: "⚙️" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth admin>
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, site, logout } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const active = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + "/"));
  const current = NAV.flatMap((g) => g.items).find((i) => active(i.href, (i as any).exact));

  return (
    <div className="admin-shell">
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="เมนูผู้ดูแล">
        <Link href="/admin" className="brand">
          <span className="brand-mark">✦</span>
          <span>
            {site.site_name}
            <div className="xs muted" style={{ fontWeight: 600 }}>Admin Console</div>
          </span>
        </Link>
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="side-group">{g.group}</div>
            {g.items.map((i) => (
              <Link key={i.href} href={i.href} className={`side-link ${active(i.href, (i as any).exact) ? "active" : ""}`}>
                <span className="ic" aria-hidden>{i.icon}</span>
                {i.label}
              </Link>
            ))}
          </div>
        ))}
        <div className="bottom stack sm">
          <Link href="/studio" className="side-link">
            <span className="ic">↗</span> ไปหน้าสมาชิก
          </Link>
          <div className="row" style={{ padding: "8px 10px" }}>
            <Avatar src={user?.avatar_url} name={user?.display_name || user?.email} size="sm" />
            <div className="grow">
              <div className="small truncate" style={{ fontWeight: 600 }}>{user?.display_name || user?.email}</div>
              <div className="xs muted">ผู้ดูแลระบบ</div>
            </div>
            <button className="btn ghost icon sm" onClick={logout} title="ออกจากระบบ" aria-label="ออกจากระบบ">↩</button>
          </div>
        </div>
      </aside>
      {open && <div className="modal-backdrop" style={{ zIndex: 55 }} onClick={() => setOpen(false)} />}

      <div className="admin-main">
        <div className="admin-top">
          <button className="btn ghost icon menu-toggle" onClick={() => setOpen(true)} aria-label="เปิดเมนู">☰</button>
          <h3>{current?.label ?? "Admin"}</h3>
          {site.maintenance_mode && <span className="badge warning" style={{ marginLeft: "auto" }}>🛠 โหมดปิดปรับปรุงเปิดอยู่</span>}
        </div>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
