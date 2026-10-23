"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { type PublicModel } from "@/components/ModelCard";
import { useAuth } from "@/components/AuthProvider";
import { StatusBadge, api, useConfirm } from "@/components/ui";
import ImageRefInput from "@/components/ImageRefInput";
import { useJobs } from "@/components/JobsProvider";
import PromptChips from "@/components/PromptChips";
import { partsToText, textToParts, type PromptPart } from "@/lib/promptParts";
import { isFinal, isVideo, num, previewUrl } from "@/lib/format";

interface Job {
  id: number;
  task_uid: string | null;
  status: string;
  result_url: string | null;
  thumbnail_url?: string | null;
  media_type?: string;
  error?: string | null;
  prompt: string;
  model_name?: string;
  started: number;
  est: number;
}

interface ExploreItem {
  id: number;
  task_uid: string | null;
  result_url: string;
  thumbnail_url: string | null;
  media_type: string;
  prompt: string;
  creator: string;
  avatar_url: string | null;
  views: number;
}

const SEED_MIN = 1_000_000;
const SEED_MAX = 999_999_999_999_999;

export default function StudioPage() {
  return (
    <RequireAuth>
      <Suspense>
        <Studio />
      </Suspense>
    </RequireAuth>
  );
}

function Studio() {
  const params = useSearchParams();
  const { user, refresh, site } = useAuth();
  const { confirm, node: confirmNode } = useConfirm();

  const [models, setModels] = useState<PublicModel[]>([]);
  const [modelId, setModelId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [railTab, setRailTab] = useState<"hot" | "new" | "top">("hot");
  const [railMedia, setRailMedia] = useState<"all" | "image" | "video" | "favorites">("all");
  const [favorites, setFavorites] = useState<number[]>([]);

  const [promptParts, setPromptParts] = useState<PromptPart[]>(() => textToParts(params.get("prompt")));
  const [negativeParts, setNegativeParts] = useState<PromptPart[]>(() => textToParts(params.get("negative")));
  const prompt = partsToText(promptParts);
  const negative = partsToText(negativeParts);
  const appliedDefault = useRef<string>(params.get("prompt") ?? "");
  const appliedNegDefault = useRef<string>(params.get("negative") ?? "");
  const [imgRef, setImgRef] = useState<string>(params.get("ref") ?? "");
  const [imgRef2, setImgRef2] = useState<string>(params.get("ref2") ?? "");
  const [seed, setSeed] = useState(params.get("seed") ?? "");
  const [lockSeed, setLockSeed] = useState(!!params.get("seed"));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const { jobs, track, version } = useJobs();
  const [now, setNow] = useState(Date.now());
  const [recent, setRecent] = useState<ExploreItem[]>([]);

  const model = models.find((m) => m.id === modelId) ?? null;

  // Fill default prompts when switching models (without overwriting user text).
  useEffect(() => {
    if (!model) return;
    const def = model.default_prompt ?? "";
    setPromptParts((cur) => {
      const t = partsToText(cur);
      return t === "" || t === appliedDefault.current ? textToParts(def) : cur;
    });
    appliedDefault.current = def;
    const negDef = model.default_negative ?? "";
    setNegativeParts((cur) => {
      const t = partsToText(cur);
      return t === "" || t === appliedNegDefault.current ? textToParts(negDef) : cur;
    });
    appliedNegDefault.current = negDef;
    if (!model.supports_image) setImgRef("");
    if (!model.supports_image2) setImgRef2("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  useEffect(() => {
    api<{ items: PublicModel[] }>("/api/models")
      .then((d) => {
        setModels(d.items);
        const want = Number(params.get("model"));
        setModelId(d.items.find((m) => m.id === want)?.id ?? d.items[0]?.id ?? null);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRecent = useCallback(() => {
    // Studio gallery mirrors the public explore feed (newest first).
    api<{ items: ExploreItem[] }>("/api/explore?pageSize=18&sort=new")
      .then((d) => setRecent(d.items))
      .catch(() => {});
  }, []);

  // Favorite models are kept per-browser in localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fav_models");
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);
  function toggleFav(id: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem("fav_models", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  useEffect(() => {
    if (activeId === null && jobs[0]) setActiveId(jobs[0].id);
  }, [activeId, jobs]);
  const tracked = jobs.find((j) => j.id === activeId);
  useEffect(() => {
    if (!tracked) return;
    setJob({
      id: tracked.id,
      task_uid: tracked.task_uid,
      status: tracked.status,
      result_url: tracked.result_url,
      thumbnail_url: tracked.thumbnail_url,
      media_type: tracked.media_type,
      error: tracked.error,
      prompt: tracked.prompt,
      model_name: tracked.model_name ?? undefined,
      started: new Date(tracked.created_at).getTime(),
      est: tracked.est_seconds || 90,
    });
  }, [tracked]);
  useEffect(loadRecent, [version, loadRecent]);

  useEffect(() => {
    if (!job || isFinal(job.status)) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [job]);

  function randomSeed() {
    setSeed(String(Math.floor(Math.random() * (SEED_MAX - SEED_MIN + 1)) + SEED_MIN));
  }

  const price = model?.price ?? 0;
  const balance = user?.credit_balance ?? 0;
  const enough = balance >= price;
  const canSubmit =
    !!model &&
    !submitting &&
    enough &&
    !site.maintenance_mode &&
    (!model.requires_image || !!imgRef) &&
    (!model.requires_image2 || !!imgRef2) &&
    (!!prompt.trim() || !!imgRef || !!imgRef2);

  // Left rail list — filter by media tab + search; sort by the chosen tab.
  const railModels = useMemo(() => {
    let list = models.filter((m) => !search || `${m.name} ${m.category ?? ""}`.toLowerCase().includes(search.toLowerCase()));
    if (railMedia === "image") list = list.filter((m) => m.output_type === "image");
    else if (railMedia === "video") list = list.filter((m) => m.output_type === "video");
    else if (railMedia === "favorites") list = list.filter((m) => favorites.includes(m.id));
    if (railTab === "new") list = [...list].sort((a, b) => b.id - a.id);
    else if (railTab === "top") list = [...list].sort((a, b) => b.price - a.price);
    else list = [...list].sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0) || b.id - a.id);
    return list;
  }, [models, search, railTab, railMedia, favorites]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!model) return;
    setError(null);
    if (model.requires_image && !imgRef) return setError(`กรุณาใส่${model.image_label || "รูปอ้างอิง"}`);
    if (model.requires_image2 && !imgRef2) return setError(`กรุณาใส่${model.image2_label || "รูปที่สอง"}`);
    if (!prompt.trim() && !imgRef && !imgRef2) return setError("กรุณาพิมพ์คำสั่ง (prompt) หรือใส่รูป");
    if (seed && (!/^\d+$/.test(seed) || Number(seed) < SEED_MIN || Number(seed) > SEED_MAX))
      return setError(`Seed ต้องอยู่ระหว่าง ${SEED_MIN.toLocaleString()} - ${SEED_MAX.toLocaleString()}`);

    if (user?.prefs.coin_popup) {
      const ok = await confirm(
        <>
          สร้างภาพนี้จะใช้ <b>{price} credit</b> (คงเหลือ {num(balance)} → {num(balance - price)}) ยืนยันหรือไม่?
        </>
      );
      if (!ok) return;
    }

    setSubmitting(true);
    try {
      const r = await api<{ id: number; task_uid: string; status: string; result_url: string | null; seed: number }>(
        "/api/generate",
        {
          method: "POST",
          json: {
            modelId: model.id,
            promptParts,
            negativeParts: model.supports_negative ? negativeParts : [],
            imgRef: model.supports_image ? imgRef || null : null,
            imgRef2: model.supports_image2 ? imgRef2 || null : null,
            seed: seed ? Number(seed) : undefined,
          },
        }
      );
      const createdAt = new Date().toISOString();
      setActiveId(r.id);
      setJob({
        id: r.id,
        task_uid: r.task_uid,
        status: r.status,
        result_url: r.result_url,
        media_type: model.output_type,
        prompt: prompt.trim(),
        model_name: model.name,
        started: Date.now(),
        est: model.est_seconds,
      });
      track({
        id: r.id,
        task_uid: r.task_uid,
        status: r.status,
        result_url: r.result_url,
        thumbnail_url: null,
        media_type: model.output_type,
        error: null,
        prompt: prompt.trim(),
        model_name: model.name,
        est_seconds: model.est_seconds,
        cost_credit: model.price,
        created_at: createdAt,
      });
      loadRecent();
      if (!lockSeed) setSeed("");
      else setSeed(String(r.seed));
      refresh();
    } catch (err: any) {
      setError(err.message);
      refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const elapsed = job ? Math.floor((now - job.started) / 1000) : 0;
  const progress = job ? Math.min(95, (elapsed / Math.max(1, job.est)) * 100) : 0;

  return (
    <div className="studio3">
      {/* ================= LEFT: model rail ================= */}
      <aside className="rail">
        <div className="rail-search">
          <input
            className="input sm"
            placeholder="🔍 ค้นหาโมเดล"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหาโมเดล"
          />
        </div>
        <div className="rail-media">
          {([["all", "🧩 ทั้งหมด"], ["image", "🖼 รูป"], ["video", "🎬 วิดีโอ"], ["favorites", "⭐ โปรด"]] as const).map(([v, l]) => (
            <button
              key={v}
              className={`rail-media-tab ${railMedia === v ? "active" : ""}`}
              onClick={() => setRailMedia(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="rail-tabs">
          {([["hot", "🔥 HOT"], ["new", "new"], ["top", "top"]] as const).map(([v, l]) => (
            <button key={v} className={`rail-tab ${railTab === v ? "active" : ""}`} onClick={() => setRailTab(v)}>
              {l}
            </button>
          ))}
        </div>
        <div className="rail-list">
          {railModels.map((m) => (
            <button
              key={m.id}
              className={`rail-card ${m.id === modelId ? "active" : ""}`}
              onClick={() => setModelId(m.id)}
              title={m.name}
            >
              <div
                className="rail-cover"
                style={m.thumbnail_url ? { backgroundImage: `url("${m.thumbnail_url}")` } : undefined}
              >
                {!m.thumbnail_url && <span className="cover-fallback" style={{ fontSize: 22 }}>✦</span>}
                {m.badge && <span className={`badge ${/hot|new|ใหม่/i.test(m.badge) ? "hot" : "info"} rail-badge`}>{m.badge}</span>}
                <span
                  className={`rail-fav ${favorites.includes(m.id) ? "on" : ""}`}
                  onClick={(e) => toggleFav(m.id, e)}
                  title={favorites.includes(m.id) ? "เอาออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
                >
                  {favorites.includes(m.id) ? "★" : "☆"}
                </span>
              </div>
              <div className="rail-meta">
                <span className="truncate" style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                <span className="xs muted row" style={{ gap: 4 }}>
                  <span className="coin" style={{ width: 11, height: 11 }} /> {m.price}
                  {m.output_type === "video" && " · 🎬"}
                </span>
              </div>
            </button>
          ))}
          {railModels.length === 0 && <p className="small muted center" style={{ padding: 20 }}>ไม่พบโมเดล</p>}
        </div>
      </aside>

      {/* ================= CENTER: inputs + gallery ================= */}
      <form className="studio-center" onSubmit={submit}>
        {model?.supports_prompt !== false && (
          <div className="field">
            <div className="row between">
              <span className="label" style={{ color: "var(--accent)" }}>● positive prompt</span>
              <span className="row" style={{ gap: 10 }}>
                {model?.default_prompt && prompt !== model.default_prompt && (
                  <button type="button" className="btn ghost sm" onClick={() => { setPromptParts(textToParts(model.default_prompt)); appliedDefault.current = model.default_prompt ?? ""; }}>
                    ↺
                  </button>
                )}
                <span className="xs muted">{prompt.length} / {model?.prompt_max_len ?? 3000}</span>
              </span>
            </div>
            <PromptChips
              id="prompt"
              parts={promptParts}
              onChange={setPromptParts}
              maxLen={model?.prompt_max_len ?? 3000}
              placeholder="พิมพ์คำสั่งแล้วกด Enter เช่น ยกมือโบก, พื้นหลังชายหาด"
            />
          </div>
        )}

        {model?.supports_negative && (
          <div className="field">
            <div className="row between">
              <span className="label" style={{ color: "var(--danger)" }}>● negative prompt</span>
              <span className="row" style={{ gap: 10 }}>
                {model?.default_negative && negative !== model.default_negative && (
                  <button type="button" className="btn ghost sm" onClick={() => { setNegativeParts(textToParts(model.default_negative)); appliedNegDefault.current = model.default_negative ?? ""; }}>
                    ↺
                  </button>
                )}
                <span className="xs muted">{negative.length} / {model?.prompt_max_len ?? 3000}</span>
              </span>
            </div>
            <PromptChips
              id="neg"
              tone="negative"
              parts={negativeParts}
              onChange={setNegativeParts}
              maxLen={model?.prompt_max_len ?? 3000}
              placeholder="เช่น blurry, low quality, extra fingers"
            />
          </div>
        )}

        {model?.instruction && <div className="instruction">💡 {model.instruction}</div>}

        {(model?.supports_image || model?.supports_image2) && (
          <div className="ref-row">
            {model?.supports_image && (
              <ImageRefInput
                label={model.image_label || "รูปอ้างอิง"}
                required={model.requires_image}
                value={imgRef}
                onChange={setImgRef}
                onError={setError}
              />
            )}
            {model?.supports_image2 && (
              <ImageRefInput
                label={model.image2_label || "รูปที่สอง"}
                required={model.requires_image2}
                value={imgRef2}
                onChange={setImgRef2}
                onError={setError}
              />
            )}
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        {/* ---- live result ---- */}
        {job && (
          <div className="stage" aria-live="polite" style={{ minHeight: 320 }}>
            {job.status === "success" && job.result_url ? (
              isVideo(job) ? (
                <video src={job.result_url} poster={job.thumbnail_url ?? undefined} controls autoPlay loop muted playsInline style={{ maxHeight: 520 }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={job.result_url} alt={job.prompt || "ผลงาน"} />
              )
            ) : isFinal(job.status) ? (
              <div className="center" style={{ padding: 36 }}>
                <div style={{ fontSize: 40 }}>😵</div>
                <p className="small muted" style={{ marginTop: 8, maxWidth: 420 }}>
                  {job.error || "สร้างไม่สำเร็จ"} — คืน credit แล้ว
                </p>
              </div>
            ) : (
              <div className="progress">
                <span className="spinner lg" />
                <h3 style={{ marginTop: 14 }}>AI กำลังสร้าง...</h3>
                <div className="bar"><i style={{ width: `${progress}%` }} /></div>
                <div className="small muted">ผ่านไป {elapsed}s · ประมาณ {job.est}s</div>
              </div>
            )}
          </div>
        )}
        {job?.status === "success" && job.result_url && (
          <div className="row end" style={{ gap: 8 }}>
            <StatusBadge status={job.status} />
            <a
              className="btn outline sm"
              href={job.task_uid ? `/api/explore/code/${encodeURIComponent(job.task_uid)}/download` : job.result_url}
              download
            >
              ⬇ ดาวน์โหลด
            </a>
            {!isVideo(job) && model?.supports_image && (
              <button type="button" className="btn outline sm" onClick={() => setImgRef(job.result_url!)}>
                ↻ ใช้เป็นรูปอ้างอิง
              </button>
            )}
          </div>
        )}

        {/* ---- gallery (public explore feed) ---- */}
        <div className="gallery-head">gallery</div>
        {recent.length === 0 ? (
          <p className="small muted center">ยังไม่มีผลงานสาธารณะ</p>
        ) : (
          <div className="gallery" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {recent.map((r) => (
              <Link
                key={r.id}
                href={r.task_uid ? `/gallery/${r.task_uid}` : "/explore"}
                className="tile"
                title={r.prompt}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl(r) ?? r.result_url} alt="" loading="lazy" />
                {isVideo(r) && <span className="tag badge info">▶</span>}
                <div className="overlay">
                  <span className="xs truncate">{r.creator}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="center" style={{ marginTop: 14 }}>
          <Link href="/explore" className="btn outline sm">ดูทั้งหมดในหน้าสำรวจ →</Link>
        </div>
      </form>

      {/* ================= RIGHT: gen + settings ================= */}
      <aside className="gen-panel">
        {!enough && model ? (
          <Link href="/wallet" className="gen-btn insufficient">
            <div className="gen-title">💳 credit ไม่พอ</div>
            <div className="small">แตะเพื่อเติมเงิน</div>
          </Link>
        ) : (
          <button className="gen-btn" type="button" onClick={submit} disabled={!canSubmit}>
            <div className="gen-title">
              {submitting ? <span className="spinner" /> : "✨ gen"}
            </div>
            <div className="gen-cost">
              <span className="coin" /> {price}
              <span className="xs" style={{ opacity: 0.8 }}>credit</span>
            </div>
          </button>
        )}

        {model && (
          <div className="gen-model">
            {model.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={model.thumbnail_url} alt="" />
            ) : (
              <div className="ph" />
            )}
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="xs muted">feature</div>
              <div className="truncate" style={{ fontWeight: 600, fontSize: 13 }}>{model.name}</div>
              <div className="xs muted">~{model.est_seconds}s · {model.output_type === "video" ? "วิดีโอ" : "รูป"}</div>
            </div>
          </div>
        )}

        <div className="gen-settings">
          <div className="gen-settings-head">⚙ settings</div>
          <div className="field">
            <label className="label" htmlFor="seed">seed</label>
            <div className="row">
              <input
                id="seed"
                className="input sm"
                inputMode="numeric"
                placeholder="สุ่มอัตโนมัติ"
                value={seed}
                onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))}
              />
              <button type="button" className="btn outline sm" onClick={randomSeed} title="สุ่ม seed">🎲</button>
            </div>
            <label className="row xs" style={{ cursor: "pointer", marginTop: 6 }}>
              <input type="checkbox" checked={lockSeed} onChange={(e) => setLockSeed(e.target.checked)} />
              ล็อก seed รอบถัดไป
            </label>
          </div>

          <div className="summary-line small">
            <span>คงเหลือหลังสร้าง</span>
            <span className={enough ? "" : "neg"} style={{ fontWeight: 700 }}>{num(balance - price)}</span>
          </div>
        </div>

        <p className="xs muted center">สร้างไม่สำเร็จคืน credit อัตโนมัติ</p>
      </aside>

      {confirmNode}
    </div>
  );
}
