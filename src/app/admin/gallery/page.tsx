"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Empty,
  Modal,
  Pager,
  StatusBadge,
  api,
  useConfirm,
  useDebounced,
  useToast,
} from "@/components/ui";
import { dateTime, isVideo, num, previewUrl, timeAgo } from "@/lib/format";

interface Item {
  id: number;
  task_uid: string | null;
  user_id: number;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  model_name: string | null;
  prompt: string;
  negative_prompt: string | null;
  img_ref: string | null;
  seed: number;
  status: string;
  result_url: string | null;
  thumbnail_url: string | null;
  media_type: string;
  error: string | null;
  cost_credit: number;
  refunded: number;
  hidden: number;
  created_at: string;
}

interface Creator {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  gens: number;
  videos: number;
}

interface Result {
  items: Item[];
  total: number;
  videos: number;
  images: number;
  credit: number;
}

const PAGE_SIZE = 24;

export default function AdminGalleryPage() {
  const toast = useToast();
  const { confirm, node: confirmNode } = useConfirm();

  const [data, setData] = useState<Result | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [models, setModels] = useState<{ id: number; name: string }[]>([]);

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [userId, setUserId] = useState("");
  const [media, setMedia] = useState("");
  const [modelId, setModelId] = useState("");
  const [sort, setSort] = useState("new");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [viewIdx, setViewIdx] = useState<number | null>(null);

  useEffect(() => {
    api<{ items: Creator[] }>("/api/admin/creators").then((d) => setCreators(d.items)).catch(() => {});
    api<{ items: { id: number; name: string }[] }>("/api/admin/models")
      .then((d) => setModels(d.items))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      status: "success",
      hasMedia: "1",
      sort,
    });
    if (dq) qs.set("q", dq);
    if (userId) qs.set("userId", userId);
    if (media) qs.set("media", media);
    if (modelId) qs.set("modelId", modelId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    try {
      setData(await api<Result>(`/api/admin/generations?${qs}`));
    } catch (e: any) {
      toast(e.message, "error");
    }
  }, [page, dq, userId, media, modelId, sort, from, to, toast]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [dq, userId, media, modelId, sort, from, to]);

  const items = data?.items ?? [];
  const view = viewIdx !== null ? items[viewIdx] : null;

  // Arrow keys move between items in the lightbox.
  const step = useCallback(
    (d: number) => setViewIdx((i) => (i === null ? null : Math.min(items.length - 1, Math.max(0, i + d)))),
    [items.length]
  );
  useEffect(() => {
    if (viewIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewIdx, step]);

  async function toggleHidden(it: Item) {
    const hide = !it.hidden;
    if (hide && !(await confirm("ซ่อนผลงานนี้จากแกลเลอรีของผู้ใช้?", true))) return;
    try {
      await api(`/api/admin/generations/${it.id}`, { method: "PATCH", json: { hidden: hide } });
      toast(hide ? "ซ่อนแล้ว" : "แสดงอีกครั้งแล้ว", "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  function resetFilters() {
    setQ("");
    setUserId("");
    setMedia("");
    setModelId("");
    setFrom("");
    setTo("");
    setSort("new");
  }

  const hasFilter = !!(dq || userId || media || modelId || from || to);
  const selected = creators.find((c) => String(c.id) === userId);

  return (
    <div className="stack lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>แกลเลอรีรวม</h1>
          <p>
            ผลงานทั้งหมดของสมาชิก{" "}
            {data && (
              <>
                · {num(data.total)} ชิ้น ({num(data.images)} รูป / {num(data.videos)} วิดีโอ) · ใช้ไป{" "}
                {num(data.credit)} credit
              </>
            )}
          </p>
        </div>
        <Link href="/admin/generations" className="btn outline">
          ดูแบบตาราง →
        </Link>
      </div>

      <div className="gal-layout">
        {/* ---------- creators sidebar ---------- */}
        <aside className="card flush gal-side">
          <div className="gal-side-head">ผู้ใช้ ({creators.length})</div>
          <div className="gal-side-list">
            <button className={`gal-user ${userId === "" ? "active" : ""}`} onClick={() => setUserId("")}>
              <span className="avatar sm">∀</span>
              <span className="grow">
                <b className="small">ทุกคน</b>
                <span className="xs muted" style={{ display: "block" }}>
                  {num(creators.reduce((a, c) => a + Number(c.gens), 0))} ชิ้น
                </span>
              </span>
            </button>
            {creators.map((c) => (
              <button
                key={c.id}
                className={`gal-user ${userId === String(c.id) ? "active" : ""}`}
                onClick={() => setUserId(String(c.id))}
                title={c.email}
              >
                <Avatar src={c.avatar_url} name={c.display_name || c.email} size="sm" />
                <span className="grow" style={{ minWidth: 0 }}>
                  <b className="small truncate" style={{ display: "block" }}>
                    {c.display_name || c.email.split("@")[0]}
                  </b>
                  <span className="xs muted">
                    {num(c.gens)} ชิ้น{Number(c.videos) > 0 ? ` · ${num(c.videos)} วิดีโอ` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* ---------- gallery ---------- */}
        <div className="stack">
          <div className="card flush">
            <div className="filters">
              <input
                className="input search"
                placeholder="🔍 ค้นหา prompt, อีเมล, ชื่อผู้ใช้..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="ค้นหา"
              />
              <div className="tabs">
                {[
                  ["", "ทั้งหมด"],
                  ["image", "🖼 รูป"],
                  ["video", "🎬 วิดีโอ"],
                ].map(([v, l]) => (
                  <button key={v} className={`tab ${media === v ? "active" : ""}`} onClick={() => setMedia(v)}>
                    {l}
                  </button>
                ))}
              </div>
              <select className="select" value={modelId} onChange={(e) => setModelId(e.target.value)} aria-label="โมเดล">
                <option value="">ทุกโมเดล</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="เรียงตาม">
                <option value="new">ใหม่สุดก่อน</option>
                <option value="old">เก่าสุดก่อน</option>
                <option value="cost">credit สูงสุด</option>
              </select>
              <input className="input sm" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="ตั้งแต่" />
              <input className="input sm" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="ถึง" />
              {hasFilter && (
                <button className="btn ghost sm" onClick={resetFilters}>
                  ✕ ล้างตัวกรอง
                </button>
              )}
            </div>

            {selected && (
              <div className="row" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <Avatar src={selected.avatar_url} name={selected.display_name || selected.email} />
                <div className="grow">
                  <b>{selected.display_name || selected.email.split("@")[0]}</b>
                  <div className="xs muted">{selected.email}</div>
                </div>
                <Link href="/admin/users" className="btn outline sm">
                  จัดการผู้ใช้
                </Link>
              </div>
            )}

            {!data ? (
              <div style={{ padding: 16 }}>
                <div className="gallery">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ aspectRatio: "1/1" }} />
                  ))}
                </div>
              </div>
            ) : items.length === 0 ? (
              <Empty icon="🖼️" title={hasFilter ? "ไม่พบผลงานที่ตรงกับเงื่อนไข" : "ยังไม่มีผลงาน"}>
                {hasFilter && (
                  <button className="btn outline" style={{ marginTop: 12 }} onClick={resetFilters}>
                    ล้างตัวกรอง
                  </button>
                )}
              </Empty>
            ) : (
              <>
                <div className="gallery" style={{ padding: 16 }}>
                  {items.map((it, i) => (
                    <button
                      key={it.id}
                      className="tile"
                      onClick={() => setViewIdx(i)}
                      title={`${it.email ?? ""} · ${it.prompt}`}
                    >
                      {previewUrl(it) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl(it)!} alt="" loading="lazy" />
                      ) : (
                        <div className="state">🎬</div>
                      )}
                      {isVideo(it) && <span className="tag badge info">▶</span>}
                      {!!it.hidden && (
                        <span className="tag badge danger" style={{ top: 8, right: 8, left: "auto" }}>
                          ซ่อน
                        </span>
                      )}
                      <div className="overlay">
                        <div className="truncate" style={{ fontWeight: 600 }}>
                          {it.display_name || it.email?.split("@")[0] || `#${it.user_id}`}
                        </div>
                        <div className="truncate">{it.prompt || "(ไม่มี prompt)"}</div>
                        <div className="xs" style={{ opacity: 0.75 }}>
                          {it.model_name} · {timeAgo(it.created_at)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ---------- lightbox ---------- */}
      <Modal open={viewIdx !== null} onClose={() => setViewIdx(null)} size="xl">
        {view && (
          <div className="viewer" style={{ margin: -22 }}>
            <div className="img" style={{ position: "relative" }}>
              {view.result_url ? (
                isVideo(view) ? (
                  <video
                    key={view.id}
                    src={view.result_url}
                    poster={view.thumbnail_url ?? undefined}
                    controls
                    autoPlay
                    loop
                    playsInline
                    style={{ maxHeight: "76vh" }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={view.result_url} alt={view.prompt} />
                )
              ) : (
                <div className="center muted" style={{ padding: 40 }}>
                  ไม่มีไฟล์
                </div>
              )}
              {viewIdx! > 0 && (
                <button className="btn ghost nav-arrow left" onClick={() => step(-1)} aria-label="ก่อนหน้า">
                  ‹
                </button>
              )}
              {viewIdx! < items.length - 1 && (
                <button className="btn ghost nav-arrow right" onClick={() => step(1)} aria-label="ถัดไป">
                  ›
                </button>
              )}
            </div>
            <div className="side">
              <div className="row between">
                <div className="row" style={{ gap: 8 }}>
                  <StatusBadge status={view.status} />
                  <span className="badge">{isVideo(view) ? "🎬 วิดีโอ" : "🖼 รูป"}</span>
                </div>
                <button className="btn ghost icon" onClick={() => setViewIdx(null)} aria-label="ปิด">
                  ✕
                </button>
              </div>

              <div className="row">
                <Avatar src={view.avatar_url} name={view.display_name || view.email} size="sm" />
                <div className="grow" style={{ minWidth: 0 }}>
                  <b className="small truncate" style={{ display: "block" }}>
                    {view.display_name || view.email?.split("@")[0]}
                  </b>
                  <span className="xs muted truncate">{view.email}</span>
                </div>
                <button className="btn outline sm" onClick={() => { setUserId(String(view.user_id)); setViewIdx(null); }}>
                  ดูทั้งหมด
                </button>
              </div>

              <div>
                <div className="label" style={{ marginBottom: 6 }}>
                  Prompt
                </div>
                <div className="prompt-box">{view.prompt || "(ไม่มี prompt)"}</div>
              </div>
              {view.negative_prompt && (
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>
                    Negative prompt
                  </div>
                  <div className="prompt-box">{view.negative_prompt}</div>
                </div>
              )}

              <dl className="kv">
                <dt>โมเดล</dt>
                <dd>{view.model_name ?? "-"}</dd>
                <dt>Seed</dt>
                <dd className="mono">{view.seed}</dd>
                <dt>Credit</dt>
                <dd>
                  {view.cost_credit}
                  {view.refunded ? <span className="badge info"> คืนแล้ว</span> : null}
                </dd>
                <dt>วันที่</dt>
                <dd>{dateTime(view.created_at)}</dd>
                <dt>Task</dt>
                <dd className="mono xs">{view.task_uid ?? "-"}</dd>
              </dl>

              {view.img_ref && (
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>
                    รูปอ้างอิง
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={view.img_ref} alt="" style={{ maxHeight: 110, borderRadius: 8 }} />
                </div>
              )}

              <div className="stack sm" style={{ marginTop: "auto" }}>
                {view.result_url && (
                  <a
                    className="btn primary block"
                    href={view.task_uid ? `/api/explore/code/${encodeURIComponent(view.task_uid)}/download` : view.result_url}
                    download
                  >
                    ⬇ ดาวน์โหลด{isVideo(view) ? "วิดีโอ" : "รูป"}
                  </a>
                )}
                <button className={`btn ${view.hidden ? "outline" : "danger"} block`} onClick={() => toggleHidden(view)}>
                  {view.hidden ? "👁 แสดงอีกครั้ง" : "🚫 ซ่อนจากผู้ใช้"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {confirmNode}
    </div>
  );
}
