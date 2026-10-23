"use client";

import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { Switch, api, useToast } from "@/components/ui";

export default function SettingsPage() {
  return (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  );
}

function Settings() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  if (!user) return null;

  async function savePrefs(patch: Record<string, unknown>, msg: string) {
    try {
      await api("/api/account", { method: "PATCH", json: { prefs: patch } });
      await refresh();
      toast(msg, "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function setPrivate(v: boolean) {
    try {
      await api("/api/account", { method: "PATCH", json: { privateMode: v } });
      await refresh();
      toast(v ? "เปิดโหมดส่วนตัวแล้ว" : "เปิดโหมดสาธารณะแล้ว", "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const Row = ({
    title,
    desc,
    checked,
    onChange,
  }: {
    title: string;
    desc: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="row between wrap" style={{ gap: 16, padding: "14px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 560 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <p className="small muted" style={{ marginTop: 3 }}>{desc}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );

  return (
    <main className="container narrow">
      <div className="page-head">
        <div>
          <h1>การตั้งค่า</h1>
          <p>ปรับแต่งการแสดงผลและการแจ้งเตือนของบัญชีคุณ</p>
        </div>
      </div>

      <div className="stack lg">
        {/* Tier */}
        <div className="card row between wrap" style={{ gap: 16 }}>
          <div>
            <div className="small muted">แพ็กเกจของคุณ</div>
            <div className="row" style={{ gap: 10, marginTop: 4 }}>
              <span className="badge info" style={{ fontSize: 14, padding: "4px 12px" }}>
                {user.role === "admin" ? "ADMIN" : "FREE"}
              </span>
              <span className="muted small">บัญชีแบบเติม credit</span>
            </div>
          </div>
          <Link href="/wallet" className="btn primary">
            เติม credit
          </Link>
        </div>

        {/* Appearance */}
        <div className="card">
          <h3>การแสดงผล</h3>
          <Row
            title="โหมดมืด (Dark mode)"
            desc="สลับธีมสีเข้ม/สว่างของเว็บ"
            checked={user.prefs.theme === "dark"}
            onChange={(v) => savePrefs({ theme: v ? "dark" : "light" }, "เปลี่ยนธีมแล้ว")}
          />
        </div>

        {/* Notifications */}
        <div className="card">
          <h3>การแจ้งเตือน</h3>
          <Row
            title="ยืนยันก่อนใช้ credit"
            desc="แสดงกล่องยืนยันก่อนหัก credit ทุกครั้งที่สร้างภาพ"
            checked={user.prefs.coin_popup}
            onChange={(v) => savePrefs({ coin_popup: v }, "บันทึกแล้ว")}
          />
          <Row
            title="ยืนยันก่อนลบรูป"
            desc="แสดงกล่องยืนยันก่อนลบรูปออกจากแกลเลอรี"
            checked={user.prefs.delete_popup}
            onChange={(v) => savePrefs({ delete_popup: v }, "บันทึกแล้ว")}
          />
        </div>

        {/* Privacy */}
        <div className="card">
          <h3>ความเป็นส่วนตัว</h3>
          <Row
            title="โหมดส่วนตัว (Private mode)"
            desc="ซ่อนผลงานทั้งหมดของคุณจากหน้าสำรวจ เหลือเพียงคุณที่เห็นภาพ prompt และ seed"
            checked={user.private_mode}
            onChange={setPrivate}
          />
        </div>

        <div className="row" style={{ gap: 10 }}>
          <Link href="/account" className="btn outline">
            👤 จัดการบัญชี
          </Link>
          <Link href="/wallet" className="btn outline">
            💳 ประวัติการเงิน
          </Link>
        </div>
      </div>
    </main>
  );
}
