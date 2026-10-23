"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { type PublicModel } from "@/components/ModelCard";
import { Empty } from "@/components/ui";

type MediaTab = "all" | "image" | "video";
type SortKey = "hot" | "new" | "top";

function typeLabel(m: PublicModel): string {
  if (m.output_type === "video") return "txt2vid";
  if (m.requires_image || m.supports_image) return "img2img";
  return "txt2img";
}

export default function FeaturesPage() {
  const [models, setModels] = useState<PublicModel[] | null>(null);
  const [media, setMedia] = useState<MediaTab>("all");
  const [cat, setCat] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("hot");
  const [q, setQ] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => setModels(d.items ?? []))
      .catch(() => setModels([]));
  }, []);

  const cats = useMemo(
    () => Array.from(new Set((models ?? []).map((m) => m.category).filter(Boolean) as string[])),
    [models]
  );
  const genTypes = useMemo(
    () => Array.from(new Set((models ?? []).map(typeLabel))),
    [models]
  );

  const list = useMemo(() => {
    let out = (models ?? []).filter(
      (m) =>
        (media === "all" || m.output_type === media) &&
        (!cat || m.category === cat) &&
        (!typeFilter || typeLabel(m) === typeFilter) &&
        (!q || `${m.name} ${m.description ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    );
    if (sort === "new") out = [...out].sort((a, b) => b.id - a.id);
    else if (sort === "top") out = [...out].sort((a, b) => b.price - a.price);
    else out = [...out].sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0) || b.id - a.id);
    return out;
  }, [models, media, cat, typeFilter, q, sort]);

  const activeCount = (cat ? 1 : 0) + (typeFilter ? 1 : 0) + (media !== "all" ? 1 : 0);

  function resetAll() {
    setCat("");
    setTypeFilter("");
    setMedia("all");
  }

  const filtersBody = (
    <>
      <div className="row between" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>filters</h3>
        <button className="btn danger sm" onClick={resetAll}>reset all ⌫</button>
      </div>

      <div className="stack">
        <div className="field">
          <span className="label">gen type</span>
          <div className="check-list">
            <label className="check-row">
              <input type="radio" name="gtype" checked={!typeFilter} onChange={() => setTypeFilter("")} />
              <span className="grow">ทั้งหมด</span>
            </label>
            {genTypes.map((t) => (
              <label key={t} className="check-row">
                <input type="radio" name="gtype" checked={typeFilter === t} onChange={() => setTypeFilter(t)} />
                <span className="grow">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">output type</span>
          <div className="check-list">
            {([["all", "ทั้งหมด"], ["image", "รูปภาพ"], ["video", "วิดีโอ"]] as const).map(([v, l]) => (
              <label key={v} className="check-row">
                <input type="radio" name="media" checked={media === v} onChange={() => setMedia(v)} />
                <span className="grow">{l}</span>
              </label>
            ))}
          </div>
        </div>

        {cats.length > 0 && (
          <div className="field">
            <span className="label">category</span>
            <div className="check-list">
              <label className="check-row">
                <input type="radio" name="cat" checked={!cat} onChange={() => setCat("")} />
                <span className="grow">ทั้งหมด</span>
              </label>
              {cats.map((c) => (
                <label key={c} className="check-row">
                  <input type="radio" name="cat" checked={cat === c} onChange={() => setCat(c)} />
                  <span className="grow truncate">{c}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <main className="container" style={{ maxWidth: 1500 }}>
      <div className="page-head">
        <div>
          <h1>Features</h1>
          <p>เลือกโมเดลเพื่อดูรายละเอียดและเริ่มสร้างผลงาน</p>
        </div>
      </div>

      <div>
        {/* toolbar */}
        <div className="feat-toolbar">
            <button className="btn outline feat-filter-btn" onClick={() => setPanelOpen(true)} aria-label="ตัวกรอง">
              <span aria-hidden>⛃</span>
              ตัวกรอง{activeCount > 0 && <span className="badge info">{activeCount}</span>}
            </button>
            <div className="tabs">
              {([["hot", "🔥 HOT"], ["new", "new"], ["top", "top"]] as const).map(([v, l]) => (
                <button key={v} className={`tab ${sort === v ? "active" : ""}`} onClick={() => setSort(v)}>
                  {l}
                </button>
              ))}
            </div>
            <input
              className="input"
              style={{ maxWidth: 320, marginLeft: "auto" }}
              placeholder="🔍 ค้นหาโมเดล..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="ค้นหาโมเดล"
            />
          </div>

          {models === null ? (
            <div className="feat-grid">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: "3/4" }} />
              ))}
            </div>
          ) : list.length === 0 ? (
            <Empty icon="🧩" title="ไม่พบโมเดล" />
          ) : (
            <div className="feat-grid">
              {list.map((m) => (
                <Link key={m.id} href={`/features/${m.feature_uid}`} className="feat-card">
                  <div
                    className="feat-cover"
                    style={m.thumbnail_url ? { backgroundImage: `url("${m.thumbnail_url}")` } : undefined}
                  >
                    {!m.thumbnail_url && <span className="cover-fallback">✦</span>}
                    {m.badge && (
                      <span className={`feat-ribbon ${/hot|new|ใหม่/i.test(m.badge) ? "hot" : ""}`}>{m.badge}</span>
                    )}
                    <span className="feat-type">{typeLabel(m)}</span>
                    {m.output_type === "video" && <span className="feat-res">video</span>}
                    <span className="feat-price">
                      <span className="coin" aria-hidden /> {m.price}
                    </span>
                    <div className="feat-cover-info">
                      <span className="feat-name truncate">{m.name}</span>
                      {m.category && <span className="xs" style={{ opacity: 0.85 }}>{m.category}</span>}
                    </div>
                  </div>
                  <div className="feat-foot">
                    <span className="truncate" style={{ fontWeight: 600 }}>{m.name}</span>
                    <span className="xs muted">⏱ ~{m.est_seconds}s</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </div>

      {/* ===== filter panel ===== */}
      {panelOpen && <div className="modal-backdrop" style={{ zIndex: 60 }} onClick={() => setPanelOpen(false)} />}
      <aside className={`filter-panel ${panelOpen ? "open" : ""}`} aria-label="ตัวกรอง">
        {filtersBody}
        <button className="btn primary lg block" style={{ marginTop: 18 }} onClick={() => setPanelOpen(false)}>
          ดูผลลัพธ์ ({list.length})
        </button>
      </aside>
    </main>
  );
}
