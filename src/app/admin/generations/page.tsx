"use client";

import { useCallback, useEffect, useState } from "react";
import { Empty, Modal, Pager, StatusBadge, api, useDebounced, useToast } from "@/components/ui";
import { dateTime, isVideo, num, previewUrl } from "@/lib/format";

interface G {
  id: number;
  task_uid: string | null;
  user_id: number;
  email: string | null;
  model_name: string | null;
  prompt: string;
  img_ref: string | null;
  img_ref2: string | null;
  status: string;
  result_url: string | null;
  thumbnail_url: string | null;
  media_type: string;
  negative_prompt: string | null;
  error: string | null;
  cost_credit: number;
  cost_coin: number;
  refunded: number;
  created_at: string;
}

export default function AdminGenerationsPage() {
  const toast = useToast();
  const [data, setData] = useState<{ items: G[]; total: number } | null>(null);
  const [models, setModels] = useState<{ id: number; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [modelId, setModelId] = useState("");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [view, setView] = useState<G | null>(null);

  useEffect(() => {
    api<{ items: { id: number; name: string }[] }>("/api/admin/models").then((d) => setModels(d.items)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set("status", status);
    if (modelId) qs.set("modelId", modelId);
    if (dq) qs.set("q", dq);
    try {
      setData(await api(`/api/admin/generations?${qs}`));
    } catch (e: any) {
      toast(e.message, "error");
    }
  }, [page, status, modelId, dq, toast]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [status, modelId, dq]);

  return (
    <div className="stack lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>งานสร้างภาพ</h1>
          <p>ทั้งหมด {num(data?.total ?? 0)} รายการ</p>
        </div>
      </div>
      <div className="card flush">
        <div className="filters">
          <input className="input search" placeholder="🔍 อีเมล, prompt หรือ task uid..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหา" />
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="สถานะ">
            <option value="">ทุกสถานะ</option>
            <option value="success">สำเร็จ</option>
            <option value="pending">กำลังสร้าง</option>
            <option value="failed">ล้มเหลว</option>
          </select>
          <select className="select" value={modelId} onChange={(e) => setModelId(e.target.value)} aria-label="โมเดล">
            <option value="">ทุกโมเดล</option>
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        {!data ? (
          <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 240 }} /></div>
        ) : data.items.length === 0 ? (
          <Empty title="ไม่พบรายการ" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th></th><th>ผู้ใช้</th><th>โมเดล</th><th>Prompt</th><th>สถานะ</th><th className="num">Credit</th><th className="num">Coin</th><th>เวลา</th></tr>
                </thead>
                <tbody>
                  {data.items.map((g) => (
                    <tr key={g.id} onClick={() => setView(g)} style={{ cursor: "pointer" }}>
                      <td style={{ width: 60 }}>
                        {previewUrl(g) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="thumb-sm" src={previewUrl(g)!} alt="" loading="lazy" />
                        ) : (
                          <div className="thumb-sm" style={{ display: "grid", placeItems: "center" }}>
                            {isVideo(g) ? "🎬" : ""}
                          </div>
                        )}
                      </td>
                      <td className="truncate" style={{ maxWidth: 200 }}>{g.email ?? `#${g.user_id}`}</td>
                      <td className="nowrap">{g.model_name ?? "-"}</td>
                      <td className="truncate small muted" style={{ maxWidth: 280 }}>{g.prompt || "-"}</td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          <StatusBadge status={g.status} />
                          {!!g.refunded && <span className="badge info">คืนแล้ว</span>}
                        </div>
                      </td>
                      <td className="num">{g.cost_credit}</td>
                      <td className="num">{g.cost_coin}</td>
                      <td className="small muted nowrap">{dateTime(g.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={30} total={data.total} onPage={setPage} />
          </>
        )}
      </div>

      <Modal open={!!view} onClose={() => setView(null)} title={`งาน #${view?.id ?? ""}`} size="lg">
        {view && (
          <div className="grid cols-2" style={{ alignItems: "start" }}>
            <div className="stack sm">
              {view.result_url ? (
                isVideo(view) ? (
                  <video
                    src={view.result_url}
                    poster={view.thumbnail_url ?? undefined}
                    controls
                    loop
                    playsInline
                    style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border)" }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={view.result_url} alt="" style={{ borderRadius: 10, border: "1px solid var(--border)" }} />
                )
              ) : (
                <div className="stage" style={{ minHeight: 220 }}><StatusBadge status={view.status} /></div>
              )}
              {(view.img_ref || view.img_ref2) && (
                <>
                  <span className="label">รูปอ้างอิง</span>
                  <div className="row" style={{ gap: 8 }}>
                    {view.img_ref && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={view.img_ref} alt="" style={{ maxHeight: 140, borderRadius: 8 }} />
                    )}
                    {view.img_ref2 && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={view.img_ref2} alt="" style={{ maxHeight: 140, borderRadius: 8 }} />
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="stack">
              <dl className="kv">
                <dt>ผู้ใช้</dt><dd>{view.email}</dd>
                <dt>โมเดล</dt><dd>{view.model_name ?? "-"}</dd>
                <dt>สถานะ</dt><dd><StatusBadge status={view.status} /></dd>
                <dt>Credit</dt><dd>{view.cost_credit} {view.refunded ? "(คืนแล้ว)" : ""}</dd>
                <dt>Coin</dt><dd>{view.cost_coin}</dd>
                <dt>Task UID</dt><dd className="mono">{view.task_uid ?? "-"}</dd>
                <dt>เวลา</dt><dd>{dateTime(view.created_at)}</dd>
              </dl>
              <div><span className="label">Prompt</span><div className="prompt-box" style={{ marginTop: 6 }}>{view.prompt || "-"}</div></div>
              {view.error && <div className="form-error">{view.error}</div>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
