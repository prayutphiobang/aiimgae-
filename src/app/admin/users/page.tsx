"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, Empty, Modal, Pager, StatusBadge, Switch, api, useConfirm, useDebounced, useToast } from "@/components/ui";
import { TX_TYPE, dateTime, isVideo, num, previewUrl, thb, timeAgo } from "@/lib/format";

interface U {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  status: "active" | "banned";
  credit_balance: number;
  has_google: number;
  last_login_at: string | null;
  created_at: string;
  gen_count: number;
  total_paid: number;
}

interface Detail {
  user: U & { has_password: number; private_mode: number };
  transactions: { id: number; type: string; credit_amount: number; balance_after: number; note: string | null; created_at: string }[];
  generations: {
    id: number;
    model_name: string | null;
    status: string;
    result_url: string | null;
    thumbnail_url: string | null;
    media_type: string;
    cost_credit: number;
    created_at: string;
  }[];
}

export default function AdminUsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const { confirm, node: confirmNode } = useConfirm();
  const [data, setData] = useState<{ items: U[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page) });
    if (dq) qs.set("q", dq);
    if (role) qs.set("role", role);
    if (status) qs.set("status", status);
    try {
      setData(await api(`/api/admin/users?${qs}`));
    } catch (e: any) {
      toast(e.message, "error");
    }
  }, [page, dq, role, status, toast]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [dq, role, status]);

  const loadDetail = useCallback(async (id: number) => {
    setDetail(null);
    try {
      setDetail(await api(`/api/admin/users/${id}`));
    } catch (e: any) {
      toast(e.message, "error");
    }
  }, [toast]);

  function open(id: number) {
    setOpenId(id);
    setDelta("");
    setNote("");
    loadDetail(id);
  }

  async function patch(body: Record<string, unknown>, msg: string) {
    if (!openId) return;
    setBusy(true);
    try {
      await api(`/api/admin/users/${openId}`, { method: "PATCH", json: body });
      toast(msg, "success");
      await loadDetail(openId);
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function applyCredit(sign: 1 | -1) {
    const n = Math.floor(Number(delta));
    if (!n || n <= 0) return toast("กรุณาใส่จำนวน credit", "error");
    if (!(await confirm(`${sign > 0 ? "เพิ่ม" : "หัก"} ${num(n)} credit ${sign > 0 ? "ให้" : "จาก"} ${detail?.user.email}?`, sign < 0))) return;
    await patch({ creditDelta: sign * n, note }, "ปรับ credit แล้ว");
    setDelta("");
    setNote("");
  }

  const u = detail?.user;
  const isSelf = u?.id === me?.id;

  return (
    <div className="stack lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>ผู้ใช้งาน</h1>
          <p>ทั้งหมด {num(data?.total ?? 0)} บัญชี</p>
        </div>
      </div>

      <div className="card flush">
        <div className="filters">
          <input className="input search" placeholder="🔍 ค้นหาอีเมลหรือชื่อ..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหา" />
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)} aria-label="บทบาท">
            <option value="">ทุกบทบาท</option>
            <option value="user">สมาชิก</option>
            <option value="admin">ผู้ดูแล</option>
          </select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="สถานะ">
            <option value="">ทุกสถานะ</option>
            <option value="active">ใช้งานอยู่</option>
            <option value="banned">ถูกระงับ</option>
          </select>
        </div>
        {!data ? (
          <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 240 }} /></div>
        ) : data.items.length === 0 ? (
          <Empty icon="👥" title="ไม่พบผู้ใช้" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ผู้ใช้</th>
                    <th>บทบาท</th>
                    <th className="num">Credit</th>
                    <th className="num">ภาพ</th>
                    <th className="num">ยอดเติม</th>
                    <th>ใช้งานล่าสุด</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <div className="row">
                          <Avatar src={x.avatar_url} name={x.display_name || x.email} size="sm" />
                          <div style={{ minWidth: 0 }}>
                            <div className="truncate" style={{ fontWeight: 600, maxWidth: 260 }}>{x.display_name || x.email.split("@")[0]}</div>
                            <div className="xs muted truncate" style={{ maxWidth: 260 }}>{x.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          {x.role === "admin" ? <span className="badge info">ผู้ดูแล</span> : <span className="badge">สมาชิก</span>}
                          {x.status === "banned" && <span className="badge danger">ระงับ</span>}
                          {!!x.has_google && <span className="badge" title="Google">G</span>}
                        </div>
                      </td>
                      <td className="num"><b>{num(x.credit_balance)}</b></td>
                      <td className="num">{num(x.gen_count)}</td>
                      <td className="num">{thb(x.total_paid, 0)}</td>
                      <td className="small muted nowrap">{x.last_login_at ? timeAgo(x.last_login_at) : "-"}</td>
                      <td className="right"><button className="btn outline sm" onClick={() => open(x.id)}>จัดการ</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={20} total={data.total} onPage={setPage} />
          </>
        )}
      </div>

      <Modal open={openId !== null} onClose={() => setOpenId(null)} title="รายละเอียดผู้ใช้" size="lg">
        {!u ? (
          <div className="center" style={{ padding: 40 }}><span className="spinner lg" /></div>
        ) : (
          <div className="stack lg">
            <div className="row wrap" style={{ gap: 16 }}>
              <Avatar src={u.avatar_url} name={u.display_name || u.email} size="lg" />
              <div className="grow">
                <h2 className="truncate">{u.display_name || u.email.split("@")[0]}</h2>
                <div className="small muted">{u.email} · ID #{u.id}</div>
                <div className="xs muted" style={{ marginTop: 4 }}>
                  สมัคร {dateTime(u.created_at)} · เข้าใช้ล่าสุด {u.last_login_at ? timeAgo(u.last_login_at) : "-"}
                </div>
              </div>
              <div className="right">
                <div className="xs muted">Credit</div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{num(u.credit_balance)}</div>
              </div>
            </div>

            <div className="grid cols-2">
              <div className="card stack sm" style={{ background: "var(--bg-2)" }}>
                <h3>ปรับ Credit</h3>
                <input className="input" inputMode="numeric" placeholder="จำนวน credit" value={delta} onChange={(e) => setDelta(e.target.value.replace(/\D/g, ""))} />
                <input className="input" placeholder="หมายเหตุ (เช่น ชดเชย, โปรโมชัน)" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="row">
                  <button className="btn primary grow" disabled={busy} onClick={() => applyCredit(1)}>+ เพิ่ม</button>
                  <button className="btn danger grow" disabled={busy} onClick={() => applyCredit(-1)}>− หัก</button>
                </div>
              </div>
              <div className="card stack sm" style={{ background: "var(--bg-2)" }}>
                <h3>สิทธิ์และสถานะ</h3>
                <div className="row between">
                  <span className="small">บทบาท</span>
                  <select
                    className="select sm"
                    style={{ width: 140 }}
                    value={u.role}
                    disabled={busy || isSelf}
                    onChange={async (e) => {
                      const r = e.target.value;
                      if (await confirm(`เปลี่ยนบทบาทเป็น "${r === "admin" ? "ผู้ดูแล" : "สมาชิก"}"?`)) patch({ role: r }, "เปลี่ยนบทบาทแล้ว");
                    }}
                  >
                    <option value="user">สมาชิก</option>
                    <option value="admin">ผู้ดูแล</option>
                  </select>
                </div>
                <div className="row between">
                  <span className="small">สถานะ</span>
                  {u.status === "banned" ? <span className="badge danger">ถูกระงับ</span> : <span className="badge success">ใช้งานอยู่</span>}
                </div>
                <div className="row between">
                  <span className="small">โหมดส่วนตัว</span>
                  <Switch
                    checked={!!u.private_mode}
                    onChange={(v: boolean) => patch({ privateMode: v }, v ? "เปิดโหมดส่วนตัวแล้ว" : "เปิดโหมดสาธารณะแล้ว")}
                  />
                </div>
                <button
                  className={`btn ${u.status === "banned" ? "outline" : "danger"} block`}
                  disabled={busy || isSelf}
                  onClick={async () => {
                    const ban = u.status !== "banned";
                    if (await confirm(ban ? "ระงับบัญชีนี้? ผู้ใช้จะเข้าระบบไม่ได้" : "ยกเลิกการระงับบัญชีนี้?", ban))
                      patch({ status: ban ? "banned" : "active" }, ban ? "ระงับบัญชีแล้ว" : "ยกเลิกการระงับแล้ว");
                  }}
                >
                  {u.status === "banned" ? "✓ ยกเลิกการระงับ" : "⛔ ระงับบัญชี"}
                </button>
                {isSelf && <span className="hint">ไม่สามารถเปลี่ยนสิทธิ์บัญชีของตัวเองได้</span>}
              </div>
            </div>

            <div>
              <h3 style={{ marginBottom: 10 }}>ผลงานล่าสุด</h3>
              {detail!.generations.length === 0 ? (
                <p className="small muted">ยังไม่มี</p>
              ) : (
                <div className="gallery" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}>
                  {detail!.generations.map((g) => (
                    <div key={g.id} className="tile" title={`${g.model_name ?? ""} · ${dateTime(g.created_at)}`}>
                      {previewUrl(g) ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={previewUrl(g)!} alt="" loading="lazy" />
                          {isVideo(g) && <span className="tag badge info">▶</span>}
                        </>
                      ) : (
                        <div className="state"><StatusBadge status={g.status} /></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 style={{ marginBottom: 10 }}>ธุรกรรมล่าสุด</h3>
              <div className="card flush table-wrap" style={{ maxHeight: 300, overflowY: "auto" }}>
                <table className="table">
                  <thead><tr><th>วันที่</th><th>ประเภท</th><th>หมายเหตุ</th><th className="num">จำนวน</th><th className="num">คงเหลือ</th></tr></thead>
                  <tbody>
                    {detail!.transactions.map((t) => {
                      const ty = TX_TYPE[t.type] ?? { label: t.type, cls: "" };
                      return (
                        <tr key={t.id}>
                          <td className="small nowrap">{dateTime(t.created_at)}</td>
                          <td><span className={`badge ${ty.cls}`}>{ty.label}</span></td>
                          <td className="small muted">{t.note ?? "-"}</td>
                          <td className={`num ${t.credit_amount >= 0 ? "pos" : "neg"}`}>{t.credit_amount >= 0 ? "+" : ""}{num(t.credit_amount)}</td>
                          <td className="num">{num(t.balance_after)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {confirmNode}
    </div>
  );
}
