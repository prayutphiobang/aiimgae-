"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Switch, api, useToast } from "@/components/ui";
import { thb } from "@/lib/format";

interface S {
  site_name: string;
  site_tagline: string;
  announcement: string;
  support_contact: string;
  maintenance_mode: boolean;
  thb_per_credit: number;
  coin_cost_thb: number;
  signup_bonus_credit: number;
  min_topup_thb: number;
}
interface I {
  mojen: boolean;
  mojen_keys: number;
  stripe: boolean;
  stripe_webhook: boolean;
  google: boolean;
  auth_secret: boolean;
  public_url: string;
}

type CfgKey =
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  | "APP_URL"
  | "GOOGLE_CLIENT_ID"
  | "GOOGLE_CLIENT_SECRET"
  | "ADMIN_EMAIL"
  | "MOJEN_FEATURE_UID";
type CfgView = Record<CfgKey, { set: boolean; source: "db" | "env" | "none"; preview: string; secret: boolean }>;

const CFG_FIELDS: { key: CfgKey; label: string; hint: string }[] = [
  { key: "STRIPE_SECRET_KEY", label: "Stripe Secret Key", hint: "sk_live_... / sk_test_..." },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe Webhook Secret", hint: "whsec_... (จาก stripe listen / dashboard)" },
  { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", label: "Stripe Publishable Key", hint: "pk_live_... / pk_test_..." },
  { key: "APP_URL", label: "App URL", hint: "โดเมนสาธารณะ เช่น https://yourapp.com" },
  { key: "GOOGLE_CLIENT_ID", label: "Google Client ID", hint: "...apps.googleusercontent.com" },
  { key: "GOOGLE_CLIENT_SECRET", label: "Google Client Secret", hint: "GOCSPX-..." },
  { key: "ADMIN_EMAIL", label: "Admin Email", hint: "อีเมลที่จะได้สิทธิ์ admin อัตโนมัติเมื่อสมัคร" },
  { key: "MOJEN_FEATURE_UID", label: "Mojen Default Feature UID", hint: "feature_... (ค่า default เมื่อโมเดลไม่ระบุ)" },
];

interface KeyView {
  keys: { masked: string; enabled: boolean }[];
  envCount: number;
  activeStatus: { masked: string; available: boolean; cooldownUntil: number }[];
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const { refresh } = useAuth();
  const [s, setS] = useState<S | null>(null);
  const [orig, setOrig] = useState<S | null>(null);
  const [integ, setInteg] = useState<I | null>(null);
  const [saving, setSaving] = useState(false);
  const [keys, setKeys] = useState<KeyView | null>(null);
  const [newKey, setNewKey] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [cfg, setCfg] = useState<CfgView | null>(null);
  const [cfgEdit, setCfgEdit] = useState<Partial<Record<CfgKey, string>>>({});
  const [cfgBusy, setCfgBusy] = useState(false);

  useEffect(() => {
    api<{ settings: S; integrations: I; config: CfgView }>("/api/admin/settings")
      .then((d) => {
        setS(d.settings);
        setOrig(d.settings);
        setInteg(d.integrations);
        setCfg(d.config);
      })
      .catch((e) => toast(e.message, "error"));
    api<KeyView>("/api/admin/mojen-keys").then(setKeys).catch(() => {});
  }, [toast]);

  async function saveConfig() {
    const patch = Object.fromEntries(Object.entries(cfgEdit).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length === 0) return;
    setCfgBusy(true);
    try {
      const d = await api<{ config: CfgView }>("/api/admin/settings", { method: "PATCH", json: { config: patch } });
      setCfg(d.config);
      setCfgEdit({});
      toast("บันทึกการเชื่อมต่อแล้ว", "success");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setCfgBusy(false);
    }
  }

  async function addKey() {
    const key = newKey.trim();
    if (!key) return;
    setKeyBusy(true);
    try {
      const d = await api<KeyView>("/api/admin/mojen-keys", { method: "POST", json: { key } });
      setKeys(d);
      setNewKey("");
      toast("เพิ่ม API key แล้ว", "success");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setKeyBusy(false);
    }
  }
  async function toggleKey(index: number, enabled: boolean) {
    setKeyBusy(true);
    try {
      setKeys(await api<KeyView>("/api/admin/mojen-keys", { method: "PATCH", json: { index, enabled } }));
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setKeyBusy(false);
    }
  }
  async function removeKey(index: number) {
    setKeyBusy(true);
    try {
      setKeys(await api<KeyView>("/api/admin/mojen-keys", { method: "DELETE", json: { index } }));
      toast("ลบ API key แล้ว", "success");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setKeyBusy(false);
    }
  }

  if (!s) return <div className="skeleton" style={{ height: 400 }} />;
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((p) => (p ? { ...p, [k]: v } : p));
  const dirty = JSON.stringify(s) !== JSON.stringify(orig);

  async function save() {
    setSaving(true);
    try {
      const d = await api<{ settings: S }>("/api/admin/settings", { method: "PATCH", json: s });
      setS(d.settings);
      setOrig(d.settings);
      toast("บันทึกการตั้งค่าแล้ว", "success");
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // Coin cost reference from Mojen's public coin packages (THB / coin).
  const MOJEN_PACKS = [
    ["350 coin / 99฿", 99 / 350],
    ["700 coin / 189฿", 189 / 700],
    ["1,400 coin / 349฿", 349 / 1400],
    ["3,500 coin / 849฿", 849 / 3500],
    ["7,000 coin / 1,599฿", 1599 / 7000],
  ] as const;

  const Status = ({ ok, label, hint }: { ok: boolean; label: string; hint: string }) => (
    <div className="status-item">
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div className="xs muted">{hint}</div>
      </div>
      {ok ? <span className="badge success">● เชื่อมต่อแล้ว</span> : <span className="badge warning">● ยังไม่ตั้งค่า</span>}
    </div>
  );

  return (
    <div className="stack lg" style={{ maxWidth: 980 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>ตั้งค่าระบบ</h1>
          <p>ค่าที่บันทึกที่นี่มีผลทันที ไม่ต้องรีสตาร์ทเซิร์ฟเวอร์</p>
        </div>
        <div className="row">
          <button className="btn outline" disabled={!dirty || saving} onClick={() => setS(orig)}>ยกเลิก</button>
          <button className="btn primary" disabled={!dirty || saving} onClick={save}>{saving ? <span className="spinner" /> : "บันทึกการตั้งค่า"}</button>
        </div>
      </div>

      <div className="card stack">
        <h3>🏷️ ข้อมูลเว็บไซต์</h3>
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="sn">ชื่อเว็บไซต์</label>
            <input id="sn" className="input" value={s.site_name} onChange={(e) => set("site_name", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="sc">ช่องทางติดต่อ</label>
            <input id="sc" className="input" value={s.support_contact} onChange={(e) => set("support_contact", e.target.value)} placeholder="เช่น LINE @yourshop" />
          </div>
          <div className="field full">
            <label className="label" htmlFor="st">สโลแกน</label>
            <input id="st" className="input" value={s.site_tagline} onChange={(e) => set("site_tagline", e.target.value)} />
          </div>
          <div className="field full">
            <label className="label" htmlFor="sa">ประกาศ (แถบด้านบนของทุกหน้า)</label>
            <input id="sa" className="input" value={s.announcement} onChange={(e) => set("announcement", e.target.value)} placeholder="เว้นว่างเพื่อซ่อน" />
          </div>
        </div>
      </div>

      <div className="card stack">
        <h3>💰 ราคาและต้นทุน</h3>
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="tpc">ราคาขาย: บาท ต่อ 1 credit</label>
            <div className="input-group">
              <input id="tpc" className="input" type="number" step="0.01" min="0.01" value={s.thb_per_credit} onChange={(e) => set("thb_per_credit", Number(e.target.value))} />
              <span className="suffix">฿</span>
            </div>
            <span className="hint">ใช้คำนวณ credit ที่ได้จากการเติมจำนวนอื่น และรายได้ในรายงาน</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="ccb">ต้นทุน: บาท ต่อ 1 Mojen coin</label>
            <div className="input-group">
              <input id="ccb" className="input" type="number" step="0.001" min="0" value={s.coin_cost_thb} onChange={(e) => set("coin_cost_thb", Number(e.target.value))} />
              <span className="suffix">฿</span>
            </div>
            <span className="hint">ราคาที่คุณซื้อ coin จาก Mojen จริง ใช้คำนวณกำไร</span>
          </div>
          <div className="full">
            <div className="label" style={{ marginBottom: 8 }}>อ้างอิงราคาแพ็กเกจ Mojen (คลิกเพื่อใช้)</div>
            <div className="row wrap" style={{ gap: 8 }}>
              {MOJEN_PACKS.map(([l, v]) => (
                <button key={l} type="button" className="btn outline sm" onClick={() => set("coin_cost_thb", Math.round(v * 10000) / 10000)}>
                  {l} = {v.toFixed(3)}฿
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="sb">โบนัสสมัครสมาชิก (credit)</label>
            <input id="sb" className="input" type="number" min={0} value={s.signup_bonus_credit} onChange={(e) => set("signup_bonus_credit", Number(e.target.value))} />
            <span className="hint">มูลค่า {thb(s.signup_bonus_credit * s.thb_per_credit)} ต่อคน · 0 = ไม่แจก</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="mt">ยอดเติมขั้นต่ำ (บาท)</label>
            <input id="mt" className="input" type="number" min={10} value={s.min_topup_thb} onChange={(e) => set("min_topup_thb", Number(e.target.value))} />
            <span className="hint">Stripe กำหนดขั้นต่ำสำหรับ THB ไว้ที่ประมาณ 10 บาท</span>
          </div>
        </div>
      </div>

      <div className="card stack">
        <h3>🛠️ การทำงานของระบบ</h3>
        <div className="row between wrap">
          <div>
            <div style={{ fontWeight: 600 }}>โหมดปิดปรับปรุง</div>
            <div className="small muted">สมาชิกจะสร้างภาพไม่ได้ (ผู้ดูแลยังใช้งานได้) และจะเห็นแถบแจ้งเตือน</div>
          </div>
          <Switch checked={s.maintenance_mode} onChange={(v) => set("maintenance_mode", v)} />
        </div>
      </div>

      {/* ===== Mojen API keys (stored in DB, auto-rotated) ===== */}
      <div className="card stack">
        <div>
          <h3>🔑 Mojen API Keys</h3>
          <p className="small muted" style={{ marginTop: 4 }}>
            เพิ่มได้หลาย key ระบบจะสลับใช้เองหลังบ้าน (round-robin) และพัก key ที่เจอ limit/coin หมดชั่วคราวแล้วสลับไป key ถัดไปอัตโนมัติ
          </p>
        </div>

        <div className="field">
          <label className="label" htmlFor="newkey">เพิ่ม API key ใหม่</label>
          <div className="row" style={{ gap: 8 }}>
            <input
              id="newkey"
              className="input"
              placeholder="mojenai_xxxxxxxx..."
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKey()}
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn primary" disabled={!newKey.trim() || keyBusy} onClick={addKey}>
              {keyBusy ? <span className="spinner" /> : "เพิ่ม"}
            </button>
          </div>
          <span className="hint">key จะถูกเก็บในฐานข้อมูล ใช้งานได้ทันทีไม่ต้องรีสตาร์ท</span>
        </div>

        {keys && (
          <div className="status-list">
            {keys.keys.length === 0 && keys.envCount === 0 && (
              <div className="xs muted" style={{ padding: "6px 0" }}>ยังไม่มี key — เพิ่มด้านบน หรือตั้งใน .env</div>
            )}
            {keys.keys.map((k, i) => {
              const st = keys.activeStatus.find((a) => a.masked === k.masked);
              return (
                <div key={i} className="status-item">
                  <div>
                    <div className="mono" style={{ fontWeight: 600 }}>{k.masked}</div>
                    <div className="xs muted">
                      {!k.enabled
                        ? "ปิดใช้งาน"
                        : st && !st.available
                        ? `พักชั่วคราว (ถึง ${new Date(st.cooldownUntil).toLocaleTimeString("th-TH")})`
                        : "พร้อมใช้งาน"}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <Switch checked={k.enabled} onChange={(v) => toggleKey(i, v)} />
                    <button className="btn danger sm" disabled={keyBusy} onClick={() => removeKey(i)}>ลบ</button>
                  </div>
                </div>
              );
            })}
            {keys.envCount > 0 && (
              <div className="status-item">
                <div>
                  <div style={{ fontWeight: 600 }}>key จาก .env</div>
                  <div className="xs muted">MOJEN_API_KEY / MOJEN_API_KEY_N — รวมใช้งานด้วยอัตโนมัติ</div>
                </div>
                <span className="badge info">{keys.envCount} key</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Editable server config (DB-backed, env fallback) ===== */}
      {cfg && (
        <div className="card stack">
          <div className="row between wrap" style={{ gap: 10 }}>
            <div>
              <h3>🔌 การเชื่อมต่อ (ตั้งค่าได้)</h3>
              <p className="small muted" style={{ marginTop: 4 }}>
                เก็บในฐานข้อมูล ใช้งานได้ทันทีไม่ต้องรีสตาร์ท · ถ้าเว้นว่างจะใช้ค่าจาก <span className="mono">.env</span> แทน
              </p>
            </div>
            <button
              className="btn primary"
              disabled={cfgBusy || Object.keys(cfgEdit).length === 0}
              onClick={saveConfig}
            >
              {cfgBusy ? <span className="spinner" /> : "บันทึกการเชื่อมต่อ"}
            </button>
          </div>

          <div className="form-grid">
            {CFG_FIELDS.map((f) => {
              const info = cfg[f.key];
              const editing = cfgEdit[f.key] !== undefined;
              return (
                <div className="field full" key={f.key}>
                  <label className="label">
                    {f.label}{" "}
                    {info.source === "db" ? (
                      <span className="badge success" style={{ marginLeft: 6 }}>● DB</span>
                    ) : info.source === "env" ? (
                      <span className="badge info" style={{ marginLeft: 6 }}>● .env</span>
                    ) : (
                      <span className="badge warning" style={{ marginLeft: 6 }}>● ยังไม่ตั้ง</span>
                    )}
                  </label>
                  <div className="input-group">
                    <input
                      className="input"
                      type={f.key.includes("SECRET") ? "password" : "text"}
                      placeholder={info.set && !editing ? info.preview : f.hint}
                      value={cfgEdit[f.key] ?? ""}
                      onChange={(e) => setCfgEdit((p) => ({ ...p, [f.key]: e.target.value }))}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {editing && (
                      <button
                        type="button"
                        className="suffix"
                        style={{ pointerEvents: "auto", cursor: "pointer", background: "none", border: "none", color: "var(--muted)" }}
                        onClick={() => setCfgEdit((p) => { const n = { ...p }; delete n[f.key]; return n; })}
                        title="ยกเลิกการแก้ไขช่องนี้"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <span className="hint">
                    {info.secret && info.set && !editing ? `ค่าปัจจุบัน: ${info.preview} · ` : ""}
                    {f.hint}
                    {info.set ? " · เว้นว่างแล้วบันทึกเพื่อล้างค่าใน DB" : ""}
                  </span>
                </div>
              );
            })}
          </div>

          {integ && (
            <div className="status-list" style={{ marginTop: 6 }}>
              <Status ok={integ.mojen} label="Mojen AI API" hint={`${integ.mojen_keys} key พร้อมใช้งาน (DB + .env)`} />
              <Status ok={integ.auth_secret} label="Session Secret" hint="AUTH_SECRET — ตั้งใน .env เท่านั้น (เปลี่ยนแล้วทุกคนหลุด login)" />
              <div className="status-item">
                <div>
                  <div style={{ fontWeight: 600 }}>URL สาธารณะสำหรับรูปอ้างอิง</div>
                  <div className="xs muted">ใช้ cloudflared tunnel ถ้ารันอยู่ ไม่งั้นใช้ APP_URL</div>
                </div>
                {/^https:\/\//.test(integ.public_url) && !/localhost|127\.0\.0\.1/.test(integ.public_url) ? (
                  <span className="mono small pos">{integ.public_url}</span>
                ) : (
                  <span className="badge warning">● ใช้ได้เฉพาะในเครื่อง</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
