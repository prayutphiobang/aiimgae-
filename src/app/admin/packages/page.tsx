"use client";

import { useCallback, useEffect, useState } from "react";
import { Empty, Modal, Switch, api, useConfirm, useToast } from "@/components/ui";
import { num, thb } from "@/lib/format";

interface Pkg {
  id: number;
  name: string;
  price_thb: number;
  credits: number;
  bonus_credits: number;
  badge: string | null;
  active: number;
  sort_order: number;
  sold: number;
}
type Form = { name: string; price_thb: string; credits: string; bonus_credits: string; badge: string; sort_order: string; active: boolean };
const EMPTY: Form = { name: "", price_thb: "", credits: "", bonus_credits: "0", badge: "", sort_order: "0", active: true };

export default function AdminPackagesPage() {
  const toast = useToast();
  const { confirm, node: confirmNode } = useConfirm();
  const [items, setItems] = useState<Pkg[] | null>(null);
  const [rate, setRate] = useState(1);
  const [editing, setEditing] = useState<Pkg | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await api<{ items: Pkg[] }>("/api/admin/packages")).items);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }, [toast]);
  useEffect(() => {
    load();
    api<{ settings: { thb_per_credit: number } }>("/api/admin/settings").then((d) => setRate(d.settings.thb_per_credit)).catch(() => {});
  }, [load]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function openEdit(p: Pkg | "new") {
    setError(null);
    setForm(
      p === "new"
        ? EMPTY
        : {
            name: p.name,
            price_thb: String(p.price_thb),
            credits: String(p.credits),
            bonus_credits: String(p.bonus_credits),
            badge: p.badge ?? "",
            sort_order: String(p.sort_order),
            active: !!p.active,
          }
    );
    setEditing(p);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      price_thb: Number(form.price_thb),
      credits: Number(form.credits),
      bonus_credits: Number(form.bonus_credits || 0),
      sort_order: Number(form.sort_order || 0),
    };
    try {
      if (editing === "new") await api("/api/admin/packages", { method: "POST", json: payload });
      else if (editing) await api(`/api/admin/packages/${editing.id}`, { method: "PATCH", json: payload });
      toast("บันทึกแล้ว", "success");
      setEditing(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Pkg) {
    if (!(await confirm(p.sold > 0 ? `แพ็กเกจนี้มียอดขายแล้ว ระบบจะปิดการขายแทนการลบ` : `ลบแพ็กเกจ "${p.name}"?`, true))) return;
    try {
      await api(`/api/admin/packages/${p.id}`, { method: "DELETE" });
      toast("เรียบร้อย", "success");
      setEditing(null);
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function toggle(p: Pkg) {
    try {
      await api(`/api/admin/packages/${p.id}`, { method: "PATCH", json: { active: !p.active } });
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const total = Number(form.credits || 0) + Number(form.bonus_credits || 0);
  const perCredit = total ? Number(form.price_thb || 0) / total : 0;

  return (
    <div className="stack lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>แพ็กเกจเติมเงิน</h1>
          <p>กำหนดราคา credit และโบนัสที่ลูกค้าจะได้รับ · อัตรามาตรฐาน {rate} ฿ / credit</p>
        </div>
        <button className="btn primary" onClick={() => openEdit("new")}>+ เพิ่มแพ็กเกจ</button>
      </div>

      <div className="card flush">
        {!items ? (
          <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 200 }} /></div>
        ) : items.length === 0 ? (
          <Empty icon="📦" title="ยังไม่มีแพ็กเกจ" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>แพ็กเกจ</th>
                  <th className="num">ราคา</th>
                  <th className="num">Credit</th>
                  <th className="num">โบนัส</th>
                  <th className="num">฿ / credit</th>
                  <th className="num">ขายแล้ว</th>
                  <th>เปิดขาย</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const t = p.credits + p.bonus_credits;
                  return (
                    <tr key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
                      <td><b>{p.name}</b> {p.badge && <span className="badge hot">{p.badge}</span>}</td>
                      <td className="num">{thb(p.price_thb, 0)}</td>
                      <td className="num">{num(p.credits)}</td>
                      <td className="num pos">{p.bonus_credits ? `+${num(p.bonus_credits)}` : "-"}</td>
                      <td className="num">{(p.price_thb / t).toFixed(3)}</td>
                      <td className="num">{num(p.sold)}</td>
                      <td><Switch checked={!!p.active} onChange={() => toggle(p)} /></td>
                      <td className="right"><button className="btn outline sm" onClick={() => openEdit(p)}>แก้ไข</button></td>
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
        title={editing === "new" ? "เพิ่มแพ็กเกจ" : "แก้ไขแพ็กเกจ"}
        footer={
          <>
            {editing && editing !== "new" && <button className="btn danger" style={{ marginRight: "auto" }} onClick={() => remove(editing)}>🗑 ลบ</button>}
            <button className="btn outline" onClick={() => setEditing(null)}>ยกเลิก</button>
            <button className="btn primary" onClick={save} disabled={saving}>{saving ? <span className="spinner" /> : "บันทึก"}</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field full">
            <label className="label" htmlFor="pn">ชื่อแพ็กเกจ</label>
            <input id="pn" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="เช่น Value" />
          </div>
          <div className="field">
            <label className="label" htmlFor="pp">ราคา (บาท)</label>
            <input id="pp" className="input" type="number" min={10} value={form.price_thb} onChange={(e) => set("price_thb", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pc">Credit</label>
            <div className="row">
              <input id="pc" className="input" type="number" min={1} value={form.credits} onChange={(e) => set("credits", e.target.value)} />
              <button type="button" className="btn outline sm" title="คำนวณจากอัตรามาตรฐาน" onClick={() => set("credits", String(Math.floor(Number(form.price_thb || 0) / rate)))}>=</button>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="pb">โบนัส credit</label>
            <input id="pb" className="input" type="number" min={0} value={form.bonus_credits} onChange={(e) => set("bonus_credits", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pd">ป้าย</label>
            <input id="pd" className="input" maxLength={30} value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="เช่น BEST SELLER" />
          </div>
          <div className="field">
            <label className="label" htmlFor="ps">ลำดับ</label>
            <input id="ps" className="input" type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
          </div>
          <div className="field" style={{ justifyContent: "flex-end" }}>
            <Switch checked={form.active} onChange={(v) => set("active", v)} label="เปิดขาย" />
          </div>
          <div className="full price-calc" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div><div className="k">ลูกค้าได้รับ</div><div className="v">{num(total)} credit</div></div>
            <div><div className="k">ราคาต่อ credit</div><div className="v">{perCredit.toFixed(3)} ฿</div></div>
            <div><div className="k">ส่วนลดเทียบมาตรฐาน</div><div className="v pos">{perCredit ? `${Math.max(0, Math.round((1 - perCredit / rate) * 100))}%` : "-"}</div></div>
          </div>
          {error && <div className="form-error full">{error}</div>}
        </div>
      </Modal>
      {confirmNode}
    </div>
  );
}
