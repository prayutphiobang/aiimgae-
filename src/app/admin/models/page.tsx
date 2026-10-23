"use client";

import { useCallback, useEffect, useState } from "react";
import { Empty, Modal, Switch, api, uploadImage, useConfirm, useToast } from "@/components/ui";
import PromptChips from "@/components/PromptChips";
import { partsToText, textToParts } from "@/lib/promptParts";
import { num, thb } from "@/lib/format";

interface AdminModel {
  id: number;
  feature_uid: string;
  name: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  badge: string | null;
  instruction: string | null;
  default_prompt: string | null;
  default_negative: string | null;
  supports_negative: number;
  supports_image2: number;
  requires_image2: number;
  image_label: string | null;
  image2_label: string | null;
  output_type: "image" | "video";
  sort_order: number;
  supports_prompt: number;
  supports_image: number;
  requires_image: number;
  prompt_max_len: number;
  est_seconds: number;
  extra_params: string | null;
  cost_coin: number;
  profit_percent: number | string;
  sell_price_credit: number;
  active: number;
  gen_count: number;
}

type Form = {
  feature_uid: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string;
  badge: string;
  instruction: string;
  default_prompt: string;
  default_negative: string;
  supports_negative: boolean;
  supports_image2: boolean;
  requires_image2: boolean;
  image_label: string;
  image2_label: string;
  output_type: "image" | "video";
  sort_order: string;
  supports_prompt: boolean;
  supports_image: boolean;
  requires_image: boolean;
  prompt_max_len: string;
  est_seconds: string;
  extra_params: string;
  cost_coin: string;
  profit_percent: string;
  active: boolean;
};

const EMPTY: Form = {
  feature_uid: "",
  name: "",
  description: "",
  category: "",
  thumbnail_url: "",
  badge: "",
  instruction: "",
  default_prompt: "",
  default_negative: "",
  supports_negative: false,
  supports_image2: false,
  requires_image2: false,
  image_label: "",
  image2_label: "",
  output_type: "image",
  sort_order: "0",
  supports_prompt: true,
  supports_image: true,
  requires_image: false,
  prompt_max_len: "3000",
  est_seconds: "90",
  extra_params: "",
  cost_coin: "3",
  profit_percent: "100",
  active: true,
};

const toForm = (m: AdminModel): Form => ({
  feature_uid: m.feature_uid,
  name: m.name,
  description: m.description ?? "",
  category: m.category ?? "",
  thumbnail_url: m.thumbnail_url ?? "",
  badge: m.badge ?? "",
  instruction: m.instruction ?? "",
  default_prompt: m.default_prompt ?? "",
  default_negative: m.default_negative ?? "",
  supports_negative: !!m.supports_negative,
  supports_image2: !!m.supports_image2,
  requires_image2: !!m.requires_image2,
  image_label: m.image_label ?? "",
  image2_label: m.image2_label ?? "",
  output_type: m.output_type ?? "image",
  sort_order: String(m.sort_order),
  supports_prompt: !!m.supports_prompt,
  supports_image: !!m.supports_image,
  requires_image: !!m.requires_image,
  prompt_max_len: String(m.prompt_max_len),
  est_seconds: String(m.est_seconds),
  extra_params: m.extra_params ?? "",
  cost_coin: String(m.cost_coin),
  profit_percent: String(Number(m.profit_percent)),
  active: !!m.active,
});

/** Accepts a raw feature uid or a full mojen.ai URL and returns the uid. */
function extractFeatureUid(v: string) {
  const m = v.match(/feature_[A-Za-z0-9]+/);
  return m ? m[0] : v.trim();
}

export default function AdminModelsPage() {
  const toast = useToast();
  const { confirm, node: confirmNode } = useConfirm();
  const [items, setItems] = useState<AdminModel[] | null>(null);
  const [rates, setRates] = useState({ thb_per_credit: 1, coin_cost_thb: 0.23 });
  const [editing, setEditing] = useState<AdminModel | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ items: AdminModel[] }>("/api/admin/models");
      setItems(d.items);
    } catch (e: any) {
      toast(e.message, "error");
      setItems([]);
    }
  }, [toast]);

  useEffect(() => {
    load();
    api<{ settings: { thb_per_credit: number; coin_cost_thb: number } }>("/api/admin/settings")
      .then((d) => setRates({ thb_per_credit: d.settings.thb_per_credit, coin_cost_thb: d.settings.coin_cost_thb }))
      .catch(() => {});
  }, [load]);

  function openNew() {
    setForm(EMPTY);
    setError(null);
    setEditing("new");
  }
  function openEdit(m: AdminModel) {
    setForm(toForm(m));
    setError(null);
    setEditing(m);
  }
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const cost = Math.max(0, Math.floor(Number(form.cost_coin) || 0));
  const profitPct = Math.max(0, Number(form.profit_percent) || 0);
  const sell = Math.max(1, Math.ceil(cost * (1 + profitPct / 100)));
  const revenue = sell * rates.thb_per_credit;
  const costThb = cost * rates.coin_cost_thb;
  const profitThb = revenue - costThb;

  async function save() {
    setError(null);
    setSaving(true);
    const payload = {
      ...form,
      feature_uid: extractFeatureUid(form.feature_uid),
      sort_order: Number(form.sort_order),
      prompt_max_len: Number(form.prompt_max_len),
      est_seconds: Number(form.est_seconds),
      cost_coin: Number(form.cost_coin),
      profit_percent: Number(form.profit_percent),
    };
    try {
      if (editing === "new") await api("/api/admin/models", { method: "POST", json: payload });
      else if (editing) await api(`/api/admin/models/${editing.id}`, { method: "PATCH", json: payload });
      toast(editing === "new" ? "เพิ่มโมเดลแล้ว" : "บันทึกแล้ว", "success");
      setEditing(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(m: AdminModel) {
    try {
      await api(`/api/admin/models/${m.id}`, { method: "PATCH", json: { active: !m.active } });
      setItems((p) => p?.map((x) => (x.id === m.id ? { ...x, active: m.active ? 0 : 1 } : x)) ?? p);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function remove(m: AdminModel) {
    const msg = m.gen_count > 0
      ? `โมเดล "${m.name}" มีประวัติการใช้งาน ${m.gen_count} ครั้ง ระบบจะปิดการใช้งานแทนการลบ เพื่อรักษารายงาน`
      : `ลบโมเดล "${m.name}" ถาวร?`;
    if (!(await confirm(msg, true))) return;
    try {
      const r = await api<{ deactivated?: boolean }>(`/api/admin/models/${m.id}`, { method: "DELETE" });
      toast(r.deactivated ? "ปิดการใช้งานแล้ว" : "ลบแล้ว", "success");
      setEditing(null);
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function onThumb(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      set("thumbnail_url", await uploadImage(file));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="stack lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>โมเดล & ราคา</h1>
          <p>
            ราคาขาย = ⌈ต้นทุน coin × (1 + กำไร%)⌉ · อัตรา: 1 credit = {rates.thb_per_credit} ฿, 1 coin = {rates.coin_cost_thb} ฿
          </p>
        </div>
        <button className="btn primary" onClick={openNew}>+ เพิ่มโมเดล</button>
      </div>

      <div className="card flush">
        {items === null ? (
          <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 200 }} /></div>
        ) : items.length === 0 ? (
          <Empty icon="🧩" title="ยังไม่มีโมเดล">
            <button className="btn primary" style={{ marginTop: 12 }} onClick={openNew}>+ เพิ่มโมเดลแรก</button>
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>โมเดล</th>
                  <th className="num">ต้นทุน</th>
                  <th className="num">กำไร</th>
                  <th className="num">ราคาขาย</th>
                  <th className="num">กำไร/ภาพ</th>
                  <th className="num">ใช้งาน</th>
                  <th>เปิดขาย</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => {
                  const p = m.sell_price_credit * rates.thb_per_credit - m.cost_coin * rates.coin_cost_thb;
                  return (
                    <tr key={m.id} style={{ opacity: m.active ? 1 : 0.55 }}>
                      <td>
                        <div className="row">
                          {m.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="thumb-sm" src={m.thumbnail_url} alt="" />
                          ) : (
                            <div className="thumb-sm" />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div className="row" style={{ gap: 6 }}>
                              <b>{m.name}</b>
                              {m.badge && <span className="badge info">{m.badge}</span>}
                            </div>
                            <div className="xs muted mono truncate" style={{ maxWidth: 280 }}>{m.feature_uid}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{m.cost_coin} coin</td>
                      <td className="num">{Number(m.profit_percent)}%</td>
                      <td className="num"><b>{m.sell_price_credit}</b> credit</td>
                      <td className={`num ${p >= 0 ? "pos" : "neg"}`}>{thb(p)}</td>
                      <td className="num">{num(m.gen_count)}</td>
                      <td><Switch checked={!!m.active} onChange={() => toggleActive(m)} /></td>
                      <td className="right"><button className="btn outline sm" onClick={() => openEdit(m)}>แก้ไข</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "เพิ่มโมเดลใหม่" : `แก้ไข: ${editing?.name ?? ""}`}
        size="lg"
        footer={
          <>
            {editing && editing !== "new" && (
              <button className="btn danger" style={{ marginRight: "auto" }} onClick={() => remove(editing)}>🗑 ลบ</button>
            )}
            <button className="btn outline" onClick={() => setEditing(null)}>ยกเลิก</button>
            <button className="btn primary" onClick={save} disabled={saving || uploading}>
              {saving ? <span className="spinner" /> : "บันทึก"}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-section full">ข้อมูลเชื่อมต่อ Mojen</div>
          <div className="field full">
            <label className="label" htmlFor="fu">Feature UID *</label>
            <input
              id="fu"
              className="input mono"
              placeholder="feature_xxxxxxxx หรือวาง URL หน้า feature ของ mojen.ai"
              value={form.feature_uid}
              onChange={(e) => set("feature_uid", e.target.value)}
              onBlur={(e) => set("feature_uid", extractFeatureUid(e.target.value))}
            />
            <span className="hint">ดูได้จาก URL ของ mojen.ai เช่น mojen.ai/features/<b>feature_3FcCte...</b> หรือในส่วน API documentation</span>
          </div>

          <div className="form-section full">ราคาและกำไร</div>
          <div className="field">
            <label className="label" htmlFor="cc">ต้นทุน (Mojen coin / ภาพ)</label>
            <input id="cc" className="input" type="number" min={0} value={form.cost_coin} onChange={(e) => set("cost_coin", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pp">กำไร (%)</label>
            <div className="input-group">
              <input id="pp" className="input" type="number" min={0} step="1" value={form.profit_percent} onChange={(e) => set("profit_percent", e.target.value)} />
              <span className="suffix">%</span>
            </div>
          </div>
          <div className="full">
            <div className="price-calc">
              <div><div className="k">ราคาขาย</div><div className="v">{sell} credit</div></div>
              <div><div className="k">รายได้/ภาพ</div><div className="v">{thb(revenue)}</div></div>
              <div><div className="k">ต้นทุน/ภาพ</div><div className="v">{thb(costThb)}</div></div>
              <div><div className="k">กำไร/ภาพ</div><div className={`v ${profitThb >= 0 ? "pos" : "neg"}`}>{thb(profitThb)}</div></div>
            </div>
            {profitThb < 0 && <div className="form-error" style={{ marginTop: 10 }}>⚠️ ราคานี้ขาดทุน ตรวจสอบต้นทุน coin เป็นบาทในหน้าตั้งค่า</div>}
          </div>

          <div className="form-section full">การแสดงผล</div>
          <div className="field">
            <label className="label" htmlFor="nm">ชื่อโมเดล *</label>
            <input id="nm" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="เช่น CharEdit-4.0" />
          </div>
          <div className="field">
            <label className="label" htmlFor="ct">หมวดหมู่</label>
            <input id="ct" className="input" list="cats" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="เช่น Character Edit" />
            <datalist id="cats">
              {Array.from(new Set((items ?? []).map((m) => m.category).filter(Boolean))).map((c) => (
                <option key={c!} value={c!} />
              ))}
            </datalist>
          </div>
          <div className="field full">
            <label className="label" htmlFor="ds">คำอธิบาย</label>
            <textarea id="ds" className="textarea" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="โมเดลนี้ทำอะไรได้บ้าง" />
          </div>
          <div className="field full">
            <label className="label" htmlFor="in">คำแนะนำการใช้งาน (แสดงในสตูดิโอ)</label>
            <textarea id="in" className="textarea" rows={2} value={form.instruction} onChange={(e) => set("instruction", e.target.value)} placeholder="เช่น อัปโหลดรูปตัวละครแบบเต็มตัว แล้วพิมพ์ท่าทางที่ต้องการ" />
          </div>
          <div className="field full">
            <label className="label" htmlFor="dp">Prompt เริ่มต้น (positive prompt)</label>
            <PromptChips
              id="dp"
              parts={textToParts(form.default_prompt)}
              onChange={(p) => set("default_prompt", partsToText(p))}
              maxLen={3000}
              placeholder="พิมพ์แล้วกด Enter เช่น เปลี่ยนพื้นหลังเป็นสตูดิโอสีขาว, แสงนุ่ม"
            />
            <span className="hint">จะถูกเติมในช่อง prompt ให้ผู้ใช้อัตโนมัติเมื่อเลือกโมเดลนี้ และผู้ใช้แก้ไขได้ · ปรับน้ำหนักด้วย − / +</span>
          </div>
          {form.supports_negative && (
            <div className="field full">
              <label className="label" htmlFor="dn2">Negative prompt เริ่มต้น</label>
              <PromptChips
                id="dn2"
                tone="negative"
                parts={textToParts(form.default_negative)}
                onChange={(p) => set("default_negative", partsToText(p))}
                maxLen={3000}
                placeholder="เช่น blurry, low quality, distorted"
              />
              <span className="hint">สิ่งที่ไม่อยากให้มีในผลลัพธ์ (text_1) ผู้ใช้แก้ไขได้</span>
            </div>
          )}
          <div className="field full">
            <span className="label">รูปปก</span>
            <div className="row" style={{ alignItems: "flex-start" }}>
              {form.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.thumbnail_url} alt="" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
              ) : (
                <div className="thumb-sm" style={{ width: 96, height: 72 }} />
              )}
              <div className="grow stack sm">
                <input className="input" value={form.thumbnail_url} onChange={(e) => set("thumbnail_url", e.target.value)} placeholder="https://... หรืออัปโหลด" />
                <label className="btn outline sm" style={{ alignSelf: "flex-start" }}>
                  {uploading ? <span className="spinner" /> : "📤 อัปโหลดรูป"}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => onThumb(e.target.files?.[0])} />
                </label>
              </div>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="bd">ป้าย (Badge)</label>
            <input id="bd" className="input" maxLength={30} value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="เช่น HOT, NEW" />
          </div>
          <div className="field">
            <label className="label" htmlFor="so">ลำดับการแสดง</label>
            <input id="so" className="input" type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
            <span className="hint">น้อย = แสดงก่อน</span>
          </div>

          <div className="form-section full">อินพุตและพฤติกรรม</div>
          <div className="full stack sm">
            <Switch checked={form.supports_prompt} onChange={(v) => set("supports_prompt", v)} label="รับข้อความ prompt (text_0)" />
            <Switch checked={form.supports_negative} onChange={(v) => set("supports_negative", v)} label="รับ negative prompt (text_1)" />
            <Switch checked={form.supports_image} onChange={(v) => set("supports_image", v)} label="รับรูปอ้างอิงรูปที่ 1 (img_ref_0)" />
            {form.supports_image && <Switch checked={form.requires_image} onChange={(v) => set("requires_image", v)} label="บังคับต้องมีรูปที่ 1" />}
            <Switch checked={form.supports_image2} onChange={(v) => set("supports_image2", v)} label="รับรูปอ้างอิงรูปที่ 2 (img_ref_1) เช่น เสื้อผ้า" />
            {form.supports_image2 && <Switch checked={form.requires_image2} onChange={(v) => set("requires_image2", v)} label="บังคับต้องมีรูปที่ 2" />}
            <Switch checked={form.active} onChange={(v) => set("active", v)} label="เปิดขายให้สมาชิก" />
          </div>
          {form.supports_image && (
            <div className="field">
              <label className="label" htmlFor="il1">ป้ายกำกับรูปที่ 1</label>
              <input id="il1" className="input" maxLength={60} value={form.image_label} onChange={(e) => set("image_label", e.target.value)} placeholder="เช่น รูปคน / Start frame" />
            </div>
          )}
          {form.supports_image2 && (
            <div className="field">
              <label className="label" htmlFor="il2">ป้ายกำกับรูปที่ 2</label>
              <input id="il2" className="input" maxLength={60} value={form.image2_label} onChange={(e) => set("image2_label", e.target.value)} placeholder="เช่น รูปเสื้อผ้า / Last frame" />
            </div>
          )}
          <div className="field">
            <label className="label" htmlFor="ot">ประเภทผลลัพธ์</label>
            <select id="ot" className="select" value={form.output_type} onChange={(e) => set("output_type", e.target.value as "image" | "video")}>
              <option value="image">รูปภาพ (image)</option>
              <option value="video">วิดีโอ (video)</option>
            </select>
            <span className="hint">โมเดลวิดีโอ เช่น Dreamlay-wan2.2 เลือก "วิดีโอ"</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="pl">ความยาว prompt สูงสุด</label>
            <input id="pl" className="input" type="number" min={1} value={form.prompt_max_len} onChange={(e) => set("prompt_max_len", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="es">เวลาประมาณ (วินาที)</label>
            <input id="es" className="input" type="number" min={1} value={form.est_seconds} onChange={(e) => set("est_seconds", e.target.value)} />
          </div>
          <div className="field full">
            <label className="label" htmlFor="ep">พารามิเตอร์เพิ่มเติม (JSON, ขั้นสูง)</label>
            <textarea
              id="ep"
              className="textarea mono"
              rows={3}
              value={form.extra_params}
              onChange={(e) => set("extra_params", e.target.value)}
              placeholder='{"aspect_ratio": "1:1"}'
            />
            <span className="hint">ส่งรวมเข้าไปใน params ของ Mojen สำหรับโมเดลที่มีพารามิเตอร์อื่นนอกจาก seed / text_0 / img_ref_0</span>
          </div>

          {error && <div className="form-error full">{error}</div>}
        </div>
      </Modal>
      {confirmNode}
    </div>
  );
}
