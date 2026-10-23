"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar, Empty, Switch, api, useDebounced, useToast } from "@/components/ui";
import ExploreViewer from "@/components/ExploreViewer";
import { useAuth } from "@/components/AuthProvider";
import { isVideo, num, previewUrl } from "@/lib/format";

export interface ExploreItem {
  id: number;
  task_uid: string | null;
  user_id: number;
  model_id: number | null;
  model_name: string | null;
  model_thumb: string | null;
  creator: string;
  avatar_url: string | null;
  prompt: string;
  negative_prompt: string | null;
  seed: number;
  result_url: string;
  thumbnail_url: string | null;
  media_type: string;
  img_ref: string | null;
  img_ref2: string | null;
  views: number;
  created_at: string;
}

interface FilterOptions {
  models: { id: number; name: string; gens: number }[];
  creators: { name: string; avatar_url: string | null; gens: number }[];
}

const PAGE_SIZE = 30;
// Repeating size pattern gives the grid a magazine-like rhythm.
const SIZES = ["sm", "md", "lg"] as const;

export default function ExplorePage() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}

function Explore() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const { user, refresh } = useAuth();

  const [items, setItems] = useState<ExploreItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [opts, setOpts] = useState<FilterOptions>({ models: [], creators: [] });
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);

  // Committed filters (what the query uses)
  const [filters, setFilters] = useState({
    q: "",
    media: "",
    modelId: [] as number[],
    creator: "",
    exclude: "",
    before: "",
    after: "",
    sort: "new",
  });
  // Draft filters inside the panel, applied on "Apply Filters"
  const [draft, setDraft] = useState(filters);
  const dq = useDebounced(filters.q);

  useEffect(() => {
    api<FilterOptions>("/api/explore/filters").then(setOpts).catch(() => {});
  }, []);

  // Deep-linked item (?item=123) opens the viewer.
  useEffect(() => {
    const id = Number(params.get("item"));
    setViewId(Number.isInteger(id) && id > 0 ? id : null);
  }, [params]);

  const load = useCallback(
    async (p: number, append: boolean) => {
      setLoading(true);
      const qs = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE), sort: filters.sort });
      if (dq) qs.set("q", dq);
      if (filters.media) qs.set("media", filters.media);
      if (filters.modelId.length) qs.set("modelId", filters.modelId.join(","));
      if (filters.creator) qs.set("creator", filters.creator);
      if (filters.exclude) qs.set("exclude", filters.exclude);
      if (filters.before) qs.set("before", filters.before);
      if (filters.after) qs.set("after", filters.after);
      try {
        const d = await api<{ items: ExploreItem[]; total: number }>(`/api/explore?${qs}`);
        setItems((prev) => (append ? [...prev, ...d.items] : d.items));
        setTotal(d.total);
      } catch (e: any) {
        toast(e.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [dq, filters, toast]
  );

  useEffect(() => {
    setPage(1);
    load(1, false);
  }, [load]);

  function applyFilters() {
    setFilters(draft);
    setPanelOpen(false);
  }
  function resetAll() {
    const empty = { q: "", media: "", modelId: [], creator: "", exclude: "", before: "", after: "", sort: "new" };
    setDraft(empty);
    setFilters(empty);
  }

  const activeCount =
    (filters.media ? 1 : 0) +
    filters.modelId.length +
    (filters.creator ? 1 : 0) +
    (filters.exclude ? 1 : 0) +
    (filters.before ? 1 : 0) +
    (filters.after ? 1 : 0);

  return (
    <main className="container" style={{ maxWidth: 1500 }}>
      <div className="page-head">
        <div>
          <h1>สำรวจผลงาน</h1>
          <p>ผลงานสาธารณะจากสมาชิกทุกคน {total > 0 && <>· {num(total)} ชิ้น</>}</p>
        </div>
        <div className="row wrap">
          <input
            className="input"
            style={{ minWidth: 240 }}
            placeholder="🔍 ค้นหา prompt, โมเดล, ผู้สร้าง..."
            value={filters.q}
            onChange={(e) => {
              setFilters((f) => ({ ...f, q: e.target.value }));
              setDraft((f) => ({ ...f, q: e.target.value }));
            }}
            aria-label="ค้นหา"
          />
          <select
            className="select"
            style={{ width: 150 }}
            value={filters.sort}
            onChange={(e) => {
              setFilters((f) => ({ ...f, sort: e.target.value }));
              setDraft((f) => ({ ...f, sort: e.target.value }));
            }}
            aria-label="เรียงตาม"
          >
            <option value="new">ใหม่สุด</option>
            <option value="popular">ยอดนิยม</option>
            <option value="old">เก่าสุด</option>
          </select>
          <button className="btn outline" onClick={() => setPanelOpen(true)}>
            ⚙ ตัวกรอง{activeCount > 0 && <span className="badge info">{activeCount}</span>}
          </button>
        </div>
      </div>

      <div className="row between wrap" style={{ marginBottom: 18, gap: 12 }}>
        <div className="tabs">
          {[
            ["", "ทั้งหมด"],
            ["image", "🖼 รูป"],
            ["video", "🎬 วิดีโอ"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={`tab ${filters.media === v ? "active" : ""}`}
              onClick={() => {
                setFilters((f) => ({ ...f, media: v }));
                setDraft((f) => ({ ...f, media: v }));
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {user && (
          <div className="privacy-pill" title="ควบคุมว่าผลงานของคุณจะแสดงต่อสาธารณะหรือไม่">
            <span className={!user.private_mode ? "on" : ""}>🌐 สาธารณะ</span>
            <Switch
              checked={!!user.private_mode}
              onChange={async (v) => {
                try {
                  await api("/api/account", { method: "PATCH", json: { privateMode: v } });
                  await refresh();
                  toast(v ? "เปิดโหมดส่วนตัว — ผลงานของคุณถูกซ่อนจากหน้าสำรวจ" : "เปิดโหมดสาธารณะ — ผลงานของคุณแสดงในหน้าสำรวจ", "success");
                  load(1, false);
                } catch (e: any) {
                  toast(e.message, "error");
                }
              }}
            />
            <span className={user.private_mode ? "on" : ""}>🔒 ส่วนตัว</span>
          </div>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="img-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`grid-item ${SIZES[i % 3]}`}>
              <div className="skeleton" style={{ width: "100%", height: "100%" }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <Empty icon="🏞️" title="ยังไม่มีผลงานสาธารณะ">
            {activeCount > 0 || dq ? (
              <button className="btn outline" style={{ marginTop: 12 }} onClick={resetAll}>
                ล้างตัวกรอง
              </button>
            ) : (
              "ผลงานที่สมาชิกสร้างจะแสดงที่นี่"
            )}
          </Empty>
        </div>
      ) : (
        <>
          <div className="img-grid">
            {items.map((it, i) => (
              <button
                key={it.id}
                className={`grid-item ${SIZES[i % 3]}`}
                onClick={() => router.push(`/explore?item=${it.id}`, { scroll: false })}
                title={it.prompt}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="img" src={previewUrl(it) ?? it.result_url} alt="" loading="lazy" />
                {isVideo(it) && <span className="grid-item-play">▶</span>}
                <div className="grid-item-footer">
                  <div className="row between">
                    <span className="row" style={{ gap: 6, minWidth: 0 }}>
                      <Avatar src={it.avatar_url} name={it.creator} size="sm" />
                      <span className="xs truncate" style={{ fontWeight: 600, maxWidth: "7em" }}>
                        {it.creator}
                      </span>
                    </span>
                    <span className="xs" style={{ opacity: 0.8 }}>
                      👁 {num(it.views)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {items.length < total && (
            <div className="center" style={{ marginTop: 24 }}>
              <button
                className="btn outline lg"
                disabled={loading}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  load(next, true);
                }}
              >
                {loading ? <span className="spinner" /> : `โหลดเพิ่ม (เหลือ ${num(total - items.length)})`}
              </button>
            </div>
          )}
        </>
      )}

      {/* ---------- filter panel ---------- */}
      {panelOpen && <div className="modal-backdrop" style={{ zIndex: 60 }} onClick={() => setPanelOpen(false)} />}
      <aside className={`filter-panel ${panelOpen ? "open" : ""}`} aria-label="ตัวกรอง">
        <div className="row between" style={{ marginBottom: 18 }}>
          <h3>ตัวกรอง</h3>
          <button className="btn danger sm" onClick={resetAll}>
            ล้างทั้งหมด ⌫
          </button>
        </div>

        <div className="stack">
          <div className="field">
            <span className="label">🎛 โมเดล</span>
            <div className="check-list">
              {opts.models.length === 0 && <span className="hint">ยังไม่มีข้อมูล</span>}
              {opts.models.map((m) => (
                <label key={m.id} className="check-row">
                  <input
                    type="checkbox"
                    checked={draft.modelId.includes(m.id)}
                    onChange={(e) =>
                      setDraft((f) => ({
                        ...f,
                        modelId: e.target.checked
                          ? [...f.modelId, m.id]
                          : f.modelId.filter((x) => x !== m.id),
                      }))
                    }
                  />
                  <span className="grow truncate">{m.name}</span>
                  <span className="xs muted">{num(m.gens)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="f-media">🖼 ประเภทสื่อ</label>
            <select
              id="f-media"
              className="select"
              value={draft.media}
              onChange={(e) => setDraft((f) => ({ ...f, media: e.target.value }))}
            >
              <option value="">ทั้งหมด</option>
              <option value="image">รูปภาพ</option>
              <option value="video">วิดีโอ</option>
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="f-creator">👤 ผู้สร้าง</label>
            <input
              id="f-creator"
              className="input"
              list="creator-list"
              placeholder="ใส่ชื่อผู้สร้าง (คั่นด้วย ,)"
              value={draft.creator}
              onChange={(e) => setDraft((f) => ({ ...f, creator: e.target.value }))}
            />
            <datalist id="creator-list">
              {opts.creators.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
          </div>

          <div className="field">
            <label className="label" htmlFor="f-exclude">🚫 ไม่รวมผู้สร้าง</label>
            <input
              id="f-exclude"
              className="input"
              placeholder="ชื่อที่ไม่ต้องการเห็น (คั่นด้วย ,)"
              value={draft.exclude}
              onChange={(e) => setDraft((f) => ({ ...f, exclude: e.target.value }))}
            />
          </div>

          <div className="field">
            <div className="row between">
              <span className="label">📅 ช่วงวันที่</span>
              <button
                className="btn ghost sm"
                onClick={() => setDraft((f) => ({ ...f, before: "", after: "" }))}
              >
                ล้างวันที่
              </button>
            </div>
            <div className="grid cols-2" style={{ gap: 10 }}>
              <label className="xs muted">
                ตั้งแต่
                <input
                  className="input sm"
                  type="date"
                  value={draft.after}
                  max={draft.before || undefined}
                  onChange={(e) => setDraft((f) => ({ ...f, after: e.target.value }))}
                />
              </label>
              <label className="xs muted">
                ก่อนวันที่
                <input
                  className="input sm"
                  type="date"
                  value={draft.before}
                  min={draft.after || undefined}
                  onChange={(e) => setDraft((f) => ({ ...f, before: e.target.value }))}
                />
              </label>
            </div>
          </div>

          <button className="btn primary lg block" onClick={applyFilters}>
            ใช้ตัวกรอง
          </button>
        </div>
      </aside>

      <ExploreViewer
        id={viewId}
        onClose={() => router.push("/explore", { scroll: false })}
        onOpen={(id) => router.push(`/explore?item=${id}`, { scroll: false })}
      />
    </main>
  );
}
