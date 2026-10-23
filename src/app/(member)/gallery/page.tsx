"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { useJobs } from "@/components/JobsProvider";
import { useAuth } from "@/components/AuthProvider";
import { Empty, Modal, Pager, StatusBadge, Switch, api, useConfirm, useDebounced, useToast } from "@/components/ui";
import { dateTime, isFinal, isVideo, previewUrl } from "@/lib/format";

interface Item {
  id: number;
  task_uid: string | null;
  model_id: number | null;
  model_name: string | null;
  seed: number;
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
  refunded: number;
  is_public: number;
  views: number;
  created_at: string;
}

export default function GalleryPage() {
  return (
    <RequireAuth>
      <Gallery />
    </RequireAuth>
  );
}

function Gallery() {
  const toast = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { version } = useJobs();
  const { confirm, node: confirmNode } = useConfirm();
  const [items, setItems] = useState<Item[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [media, setMedia] = useState("");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [view, setView] = useState<Item | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const pageSize = 24;

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) qs.set("status", status);
    if (media) qs.set("media", media);
    if (dq) qs.set("q", dq);
    try {
      const d = await api<{ items: Item[]; total: number }>(`/api/history?${qs}`);
      setItems(d.items);
      setTotal(d.total);
    } catch (e: any) {
      toast(e.message, "error");
      setItems([]);
    }
  }, [page, status, media, dq, toast]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [status, media, dq]);

  // JobsProvider polls pending jobs app-wide; reload the grid whenever one finishes.
  useEffect(() => {
    if (version > 0) load();
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(item: Item) {
    if (user?.prefs.delete_popup && !(await confirm("ลบภาพนี้ออกจากแกลเลอรี? (ไม่สามารถกู้คืนได้)", true))) return;
    try {
      await api(`/api/history/${item.id}`, { method: "DELETE" });
      toast("ลบแล้ว", "success");
      setView(null);
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  function reuseHref(item: Item) {
    const qs = new URLSearchParams();
    if (item.model_id) qs.set("model", String(item.model_id));
    if (item.prompt) qs.set("prompt", item.prompt);
    if (item.img_ref) qs.set("ref", item.img_ref);
    qs.set("seed", String(item.seed));
    return `/studio?${qs}`;
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function enterSelect(id?: number) {
    setSelectMode(true);
    if (id) setSelected(new Set([id]));
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function tileClick(it: Item) {
    if (selectMode) toggleSelect(it.id);
    // Finished work opens the full detail page; pending/failed stay in the modal
    // so the user still sees progress/errors.
    else if (it.task_uid && it.status === "success" && it.result_url) router.push(`/gallery/${it.task_uid}`);
    else setView(it);
  }

  async function bulkVisibility(isPublic: boolean) {
    if (!selected.size) return;
    setBulkBusy(true);
    try {
      const d = await api<{ affected: number }>("/api/history/bulk", {
        method: "POST",
        json: { action: isPublic ? "public" : "private", ids: [...selected] },
      });
      toast(isPublic ? `แสดงในหน้าสำรวจแล้ว ${d.affected} ภาพ` : `ตั้งเป็นส่วนตัวแล้ว ${d.affected} ภาพ`, "success");
      exitSelect();
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    if (!selected.size) return;
    if (user?.prefs.delete_popup && !(await confirm(`ลบ ${selected.size} ภาพที่เลือก? (ไม่สามารถกู้คืนได้)`, true))) return;
    setBulkBusy(true);
    try {
      const d = await api<{ affected: number }>("/api/history/bulk", {
        method: "POST",
        json: { action: "delete", ids: [...selected] },
      });
      toast(`ลบแล้ว ${d.affected} ภาพ`, "success");
      exitSelect();
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBulkBusy(false);
    }
  }

  function bulkDownload() {
    if (!items) return;
    const ids = items.filter((it) => selected.has(it.id) && it.result_url).map((it) => it.id);
    if (!ids.length) {
      toast("ไม่มีไฟล์ให้ดาวน์โหลด", "error");
      return;
    }
    ids.forEach((id, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = `/api/history/${id}/download`;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 500);
    });
    toast(`กำลังดาวน์โหลด ${ids.length} ไฟล์`, "success");
  }

  return (
    <main className="container">
      {selectMode && (
        <div className="select-bar">
          <div className="select-bar-inner">
            <span className="count">{selected.size.toLocaleString()} ภาพ</span>
            <div className="spacer" />
            <button className="btn primary" disabled={!selected.size || bulkBusy} onClick={bulkDownload}>
              ⬇ ดาวน์โหลด
            </button>
            <button className="btn outline" disabled={!selected.size || bulkBusy} onClick={() => bulkVisibility(false)}>
              🔒 เป็นส่วนตัว
            </button>
            <button className="btn outline" disabled={!selected.size || bulkBusy} onClick={() => bulkVisibility(true)}>
              🌐 เปิดสาธารณะ
            </button>
            <button className="btn danger" disabled={!selected.size || bulkBusy} onClick={bulkDelete}>
              🗑 ลบ
            </button>
            <button className="btn ghost" disabled={!selected.size || bulkBusy} onClick={() => setSelected(new Set())}>
              ล้างที่เลือก
            </button>
            <button className="btn ghost" onClick={exitSelect}>
              ✕ ยกเลิก
            </button>
          </div>
        </div>
      )}
      <div className="page-head">
        <div>
          <h1>แกลเลอรีของฉัน</h1>
          <p>ผลงานทั้งหมด {total.toLocaleString()} ภาพ</p>
        </div>
        <Link href="/studio" className="btn primary">
          ✨ สร้างภาพใหม่
        </Link>
      </div>

      <div className="row wrap" style={{ marginBottom: 18 }}>
        <div className="tabs">
          {[
            ["", "ทั้งหมด"],
            ["success", "สำเร็จ"],
            ["pending", "กำลังสร้าง"],
            ["failed", "ล้มเหลว"],
          ].map(([v, l]) => (
            <button key={v} className={`tab ${status === v ? "active" : ""}`} onClick={() => setStatus(v)}>
              {l}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
          <select
            className="input"
            style={{ maxWidth: 150 }}
            value={media}
            onChange={(e) => setMedia(e.target.value)}
            aria-label="กรองประเภทสื่อ"
          >
            <option value="">ทุกประเภท</option>
            <option value="image">🖼 รูปภาพ</option>
            <option value="video">▶ วิดีโอ</option>
          </select>
          <input
            className="input"
            style={{ maxWidth: 260 }}
            placeholder="🔍 ค้นหา prompt หรือรหัสรูป..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="ค้นหา"
          />
          {selectMode ? (
            <button className="btn ghost" onClick={exitSelect}>
              ✕ ยกเลิก
            </button>
          ) : (
            <button className="btn outline" onClick={() => enterSelect()}>
              ☑ เลือก
            </button>
          )}
        </div>
      </div>

      {items === null ? (
        <div className="gallery">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: "1/1" }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <Empty title={q || status ? "ไม่พบผลงานที่ตรงกับเงื่อนไข" : "ยังไม่มีผลงาน"}>
            {!q && !status && (
              <Link href="/studio" className="btn primary" style={{ marginTop: 14 }}>
                สร้างภาพแรกของคุณ
              </Link>
            )}
          </Empty>
        </div>
      ) : (
        <>
          <div className="gallery">
            {items.map((it) => (
              <button
                key={it.id}
                className={`tile ${selectMode && selected.has(it.id) ? "selected" : ""}`}
                onClick={() => tileClick(it)}
                onContextMenu={(e) => {
                  if (!selectMode) {
                    e.preventDefault();
                    enterSelect(it.id);
                  }
                }}
                aria-label={it.prompt || "ผลงาน"}
                aria-pressed={selectMode ? selected.has(it.id) : undefined}
              >
                {previewUrl(it) ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl(it)!} alt="" loading="lazy" />
                    {isVideo(it) && <span className="tag badge info">▶ วิดีโอ</span>}
                  </>
                ) : (
                  <div className="state">
                    {isFinal(it.status) ? <span style={{ fontSize: 28 }}>⚠️</span> : <span className="spinner lg" />}
                    <StatusBadge status={it.status} />
                  </div>
                )}
                {selectMode && (
                  <span className={`tile-check ${selected.has(it.id) ? "on" : ""}`} aria-hidden>
                    {selected.has(it.id) ? "✓" : ""}
                  </span>
                )}
                {!it.is_public && <span className="tile-lock" aria-hidden>🔒</span>}
                <div className="overlay">
                  <div className="truncate" style={{ fontWeight: 600 }}>{it.model_name ?? "-"}</div>
                  <div className="truncate">{it.prompt || "(ไม่มี prompt)"}</div>
                </div>
              </button>
            ))}
          </div>
          {total > pageSize && (
            <div className="card flush" style={{ marginTop: 18 }}>
              <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />
            </div>
          )}
        </>
      )}

      <Modal open={!!view} onClose={() => setView(null)} size="xl">
        {view && (
          <div className="viewer" style={{ margin: -22 }}>
            <div className="img">
              {view.result_url ? (
                isVideo(view) ? (
                  <video src={view.result_url} poster={view.thumbnail_url ?? undefined} controls autoPlay loop playsInline style={{ maxHeight: "76vh" }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={view.result_url} alt={view.prompt || "ผลงาน"} />
                )
              ) : (
                <div className="center muted" style={{ padding: 40 }}>
                  {isFinal(view.status) ? "ไม่มีภาพ" : <span className="spinner lg" />}
                </div>
              )}
            </div>
            <div className="side">
              <div className="row between">
                <StatusBadge status={view.status} />
                <button className="btn ghost icon" onClick={() => setView(null)} aria-label="ปิด">
                  ✕
                </button>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Prompt</div>
                <div className="prompt-box">{view.prompt || "(ไม่มี prompt)"}</div>
              </div>
              <dl className="kv">
                <dt>โมเดล</dt>
                <dd>{view.model_name ?? "-"}</dd>
                <dt>Seed</dt>
                <dd className="mono">{view.seed}</dd>
                <dt>ค่าใช้จ่าย</dt>
                <dd>
                  {view.cost_credit} credit {view.refunded ? <span className="badge info">คืนแล้ว</span> : null}
                </dd>
                <dt>วันที่</dt>
                <dd>{dateTime(view.created_at)}</dd>
              </dl>
              {view.error && <div className="form-error">{view.error}</div>}
              {(view.img_ref || view.img_ref2) && (
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>รูปอ้างอิง</div>
                  <div className="row" style={{ gap: 8 }}>
                    {view.img_ref && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={view.img_ref} alt="" style={{ maxHeight: 120, borderRadius: 8 }} />
                    )}
                    {view.img_ref2 && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={view.img_ref2} alt="" style={{ maxHeight: 120, borderRadius: 8 }} />
                    )}
                  </div>
                </div>
              )}
              {view.result_url && (
                <div className="row between" style={{ padding: "10px 12px", background: "var(--bg-2)", borderRadius: 10 }}>
                  <span>
                    <span className="small" style={{ fontWeight: 600 }}>
                      {view.is_public ? "🌐 แสดงในหน้าสำรวจ" : "🔒 ส่วนตัว"}
                    </span>
                    <span className="xs muted" style={{ display: "block" }}>
                      👁 {view.views ?? 0} ครั้ง
                    </span>
                  </span>
                  <Switch
                    checked={!!view.is_public}
                    onChange={async (v) => {
                      try {
                        await api(`/api/history/${view.id}/visibility`, { method: "PATCH", json: { isPublic: v } });
                        setView({ ...view, is_public: v ? 1 : 0 });
                        toast(v ? "แสดงในหน้าสำรวจแล้ว" : "ตั้งเป็นส่วนตัวแล้ว", "success");
                        load();
                      } catch (e: any) {
                        toast(e.message, "error");
                      }
                    }}
                  />
                </div>
              )}

              <div className="stack sm" style={{ marginTop: "auto" }}>
                {view.result_url && (
                  <a className="btn primary block" href={`/api/history/${view.id}/download`} download>
                    ⬇ ดาวน์โหลด{isVideo(view) ? "วิดีโอ" : ""}
                  </a>
                )}
                <Link className="btn outline block" href={reuseHref(view)}>
                  ↻ สร้างซ้ำด้วยค่าเดิม
                </Link>
                {view.result_url && !isVideo(view) && (
                  <Link
                    className="btn outline block"
                    href={`/studio?${new URLSearchParams({ ref: view.result_url, ...(view.model_id ? { model: String(view.model_id) } : {}) })}`}
                  >
                    🖼 ใช้ภาพนี้เป็นรูปอ้างอิง
                  </Link>
                )}
                <button className="btn danger block" onClick={() => remove(view)}>
                  🗑 ลบ
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {confirmNode}
    </main>
  );
}
