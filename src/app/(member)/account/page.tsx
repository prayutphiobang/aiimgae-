"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, Switch, api, useToast } from "@/components/ui";
import { dateOnly, num } from "@/lib/format";

export default function AccountPage() {
  return (
    <RequireAuth>
      <Account />
    </RequireAuth>
  );
}

function Account() {
  const { user, refresh, logout } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => setName(user?.display_name ?? ""), [user?.display_name]);
  if (!user) return null;

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      await api("/api/account", { method: "PATCH", json: { displayName: name } });
      await refresh();
      toast("บันทึกชื่อแล้ว", "success");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSavingName(false);
    }
  }

  async function savePw(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (next.length < 6) return setPwError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
    if (next !== confirmPw) return setPwError("ยืนยันรหัสผ่านไม่ตรงกัน");
    setSavingPw(true);
    try {
      await api("/api/account", { method: "PATCH", json: { currentPassword: cur, newPassword: next } });
      await refresh();
      setCur("");
      setNext("");
      setConfirmPw("");
      toast("เปลี่ยนรหัสผ่านแล้ว", "success");
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <main className="container narrow">
      <div className="page-head">
        <div>
          <h1>บัญชีของฉัน</h1>
          <p>จัดการข้อมูลส่วนตัวและความปลอดภัย</p>
        </div>
      </div>

      <div className="stack lg">
        <div className="card row wrap" style={{ gap: 18 }}>
          <Avatar src={user.avatar_url} name={user.display_name || user.email} size="lg" />
          <div className="grow">
            <h2 className="truncate">{user.display_name || user.email.split("@")[0]}</h2>
            <div className="small muted">{user.email}</div>
            <div className="row wrap" style={{ marginTop: 8 }}>
              {user.role === "admin" && <span className="badge info">ผู้ดูแลระบบ</span>}
              {user.has_google && <span className="badge">Google</span>}
              <span className="badge">สมาชิกตั้งแต่ {dateOnly(user.created_at)}</span>
            </div>
          </div>
          <div className="right">
            <div className="xs muted">Credit</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{num(user.credit_balance)}</div>
          </div>
        </div>

        <form className="card stack" onSubmit={saveName}>
          <h3>ข้อมูลส่วนตัว</h3>
          <div className="field">
            <label className="label" htmlFor="dn">ชื่อที่แสดง</label>
            <input id="dn" className="input" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="em">อีเมล</label>
            <input id="em" className="input" value={user.email} disabled />
          </div>
          <div className="row end">
            <button className="btn primary" disabled={savingName || name === (user.display_name ?? "")}>
              {savingName ? <span className="spinner" /> : "บันทึก"}
            </button>
          </div>
        </form>

        <form className="card stack" onSubmit={savePw}>
          <div>
            <h3>{user.has_password ? "เปลี่ยนรหัสผ่าน" : "ตั้งรหัสผ่าน"}</h3>
            {!user.has_password && (
              <p className="small muted" style={{ marginTop: 4 }}>
                บัญชีของคุณเข้าสู่ระบบด้วย Google ตั้งรหัสผ่านเพื่อเข้าสู่ระบบด้วยอีเมลได้ด้วย
              </p>
            )}
          </div>
          {user.has_password && (
            <div className="field">
              <label className="label" htmlFor="cur">รหัสผ่านปัจจุบัน</label>
              <input id="cur" className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
            </div>
          )}
          <div className="grid cols-2">
            <div className="field">
              <label className="label" htmlFor="np">รหัสผ่านใหม่</label>
              <input id="np" className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor="cp">ยืนยันรหัสผ่านใหม่</label>
              <input id="cp" className="input" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            </div>
          </div>
          {pwError && <div className="form-error">{pwError}</div>}
          <div className="row end">
            <button className="btn primary" disabled={savingPw || !next}>
              {savingPw ? <span className="spinner" /> : "บันทึกรหัสผ่าน"}
            </button>
          </div>
        </form>

        <div className="card stack">
          <h3>ความเป็นส่วนตัว</h3>
          <div className="row between wrap" style={{ gap: 16 }}>
            <div style={{ maxWidth: 520 }}>
              <div style={{ fontWeight: 600 }}>
                {user.private_mode ? "🔒 โหมดส่วนตัว (private mode)" : "🌐 โหมดสาธารณะ (public mode)"}
              </div>
              <p className="small muted" style={{ marginTop: 4 }}>
                {user.private_mode
                  ? "ผลงานของคุณทั้งหมดถูกซ่อนจากหน้าสำรวจ มีเพียงคุณที่เห็นภาพ prompt และ seed"
                  : "ผลงานของคุณจะแสดงในหน้าสำรวจให้สมาชิกอื่นเห็น พร้อม prompt และ seed (เลือกซ่อนรายชิ้นได้ในแกลเลอรี)"}
              </p>
            </div>
            <Switch
              checked={!!user.private_mode}
              onChange={async (v) => {
                try {
                  await api("/api/account", { method: "PATCH", json: { privateMode: v } });
                  await refresh();
                  toast(v ? "เปิดโหมดส่วนตัวแล้ว" : "เปิดโหมดสาธารณะแล้ว", "success");
                } catch (e: any) {
                  toast(e.message, "error");
                }
              }}
            />
          </div>
        </div>

        <div className="card row between wrap">
          <div>
            <h3>ออกจากระบบ</h3>
            <p className="small muted">ออกจากระบบบนอุปกรณ์นี้</p>
          </div>
          <button className="btn outline" onClick={logout}>↩️ ออกจากระบบ</button>
        </div>
      </div>
    </main>
  );
}
