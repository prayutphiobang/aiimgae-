"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Empty, api, useToast } from "@/components/ui";
import { dateTime, isVideo, num } from "@/lib/format";
import { textToParts } from "@/lib/promptParts";

interface DetailItem {
  id: number;
  task_uid: string | null;
  user_id: number;
  model_id: number | null;
  model_name: string | null;
  model_thumb: string | null;
  model_extra: string | null;
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
  is_public: number;
  is_owner?: boolean;
  views: number;
  created_at: string;
}

interface Related {
  id: number;
  task_uid: string | null;
  result_url: string;
  thumbnail_url: string | null;
  media_type: string;
  creator: string;
  avatar_url: string | null;
}

function aspectFromExtra(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return typeof v?.aspect_ratio === "string" ? v.aspect_ratio : null;
  } catch {
    return null;
  }
}

export default function GalleryDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const toast = useToast();
  const router = useRouter();
  const [data, setData] = useState<{ item: DetailItem; related: Related[] } | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let alive = true;
    setState("loading");
    api<{ item: DetailItem; related: Related[] }>(`/api/explore/code/${encodeURIComponent(code)}`)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setState("ready");
      })
      .catch(() => alive && setState("notfound"));
    return () => {
      alive = false;
    };
  }, [code]);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`คัดลอก${what}แล้ว`, "success");
    } catch {
      toast("คัดลอกไม่สำเร็จ", "error");
    }
  }

  /** Copy prompt to clipboard, then open the studio prefilled with this image's settings. */
  function useKeywords(it: DetailItem) {
    navigator.clipboard?.writeText(it.prompt).catch(() => {});
    const qs = new URLSearchParams();
    if (it.model_id) qs.set("model", String(it.model_id));
    if (it.prompt) qs.set("prompt", it.prompt);
    if (it.negative_prompt) qs.set("negative", it.negative_prompt);
    qs.set("seed", String(it.seed));
    toast("คัดลอก keywords แล้ว ไปที่หน้าสร้างภาพ", "success");
    router.push(`/studio?${qs}`);
  }

  if (state === "loading") {
    return (
      <main className="container">
        <div className="viewer-page">
          <div className="skeleton" style={{ aspectRatio: "16/10", borderRadius: 14 }} />
          <div className="stack">
            <div className="skeleton" style={{ height: 28, width: "50%" }} />
            <div className="skeleton" style={{ height: 200 }} />
          </div>
        </div>
      </main>
    );
  }

  if (state === "notfound" || !data) {
    return (
      <main className="container">
        <Empty icon="🖼️" title="ไม่พบผลงานนี้ หรือถูกตั้งเป็นส่วนตัว">
          <Link href="/gallery" className="btn primary" style={{ marginTop: 14 }}>
            ← กลับไปแกลเลอรี
          </Link>
        </Empty>
      </main>
    );
  }

  const item = data.item;
  const promptParts = textToParts(item.prompt);
  const negParts = textToParts(item.negative_prompt);
  const aspect = aspectFromExtra(item.model_extra);

  return (
    <main className="container" style={{ maxWidth: 1300 }}>
      <div className="row between" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <Link href={item.is_owner ? "/gallery" : "/explore"} className="btn ghost sm">
          ← {item.is_owner ? "แกลเลอรี" : "สำรวจ"}
        </Link>
        <span className="row" style={{ gap: 8 }}>
          {item.is_owner && (
            <span className="badge">{item.is_public ? "🌐 สาธารณะ" : "🔒 ส่วนตัว"}</span>
          )}
          <button className="btn primary sm" onClick={() => useKeywords(item)}>⧉ copy keywords → gen</button>
        </span>
      </div>

      <div className="viewer-page">
        {/* LEFT: image + reactions */}
        <div>
          <div className="viewer-stage">
            {isVideo(item) ? (
              <video src={item.result_url} poster={item.thumbnail_url ?? undefined} controls autoPlay loop playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.result_url}
                alt={item.prompt}
                onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              />
            )}
          </div>
          <div className="row between" style={{ marginTop: 12 }}>
            <span className="row" style={{ gap: 6 }}>
              <span className="badge">👁 {num(item.views)}</span>
              <span className="badge">{isVideo(item) ? "🎬 วิดีโอ" : "🖼 รูป"}</span>
            </span>
            <Link href={`/explore?creator=${encodeURIComponent(item.creator)}`} className="row" style={{ gap: 8 }}>
              <Avatar src={item.avatar_url} name={item.creator} size="sm" />
              <span className="truncate" style={{ fontWeight: 600 }}>{item.creator}</span>
            </Link>
          </div>
        </div>

        {/* RIGHT: info panel */}
        <div className="stack">
          {/* model header */}
          <div className="row" style={{ gap: 12 }}>
            {item.model_thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.model_thumb} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} />
            ) : (
              <div className="thumb-sm" style={{ width: 56, height: 56 }} />
            )}
            <div className="grow" style={{ minWidth: 0 }}>
              <h2 className="truncate" style={{ margin: 0 }}>{item.model_name ?? "-"}</h2>
              <span className="row xs muted" style={{ gap: 6 }}>
                👁 {num(item.views)}
                {item.task_uid && (
                  <>
                    · Imgcode: <span className="mono">{item.task_uid}</span>
                    <button className="btn ghost icon xs" onClick={() => copy(item.task_uid!, "imgcode")} aria-label="คัดลอก imgcode">⧉</button>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* positive prompt chips */}
          {promptParts.length > 0 && (
            <div>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span className="label">positive prompt</span>
                <button className="btn ghost sm" onClick={() => copy(item.prompt, "prompt")}>⧉</button>
              </div>
              <div className="chips-view">
                {promptParts.map((p, i) => (
                  <span className="chip-ro teal" key={i}>
                    <span className="chip-ro-text">{p.text}</span>
                    <span className="chip-ro-w">{p.weight.toFixed(1)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* negative prompt chips */}
          <div>
            <div className="row between" style={{ marginBottom: 6 }}>
              <span className="label">negative prompt</span>
              {negParts.length > 0 && (
                <button className="btn ghost sm" onClick={() => copy(item.negative_prompt ?? "", "negative prompt")}>⧉</button>
              )}
            </div>
            {negParts.length > 0 ? (
              <div className="chips-view">
                {negParts.map((p, i) => (
                  <span className="chip-ro red" key={i}>
                    <span className="chip-ro-text">{p.text}</span>
                    <span className="chip-ro-w">{p.weight.toFixed(1)}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="muted">-</span>
            )}
          </div>

          {(item.img_ref || item.img_ref2) && (
            <div>
              <div className="label" style={{ marginBottom: 6 }}>รูปอ้างอิง</div>
              <div className="row" style={{ gap: 8 }}>
                {item.img_ref && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.img_ref} alt="" style={{ maxHeight: 110, borderRadius: 8, border: "1px dashed var(--border-2)" }} />
                )}
                {item.img_ref2 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.img_ref2} alt="" style={{ maxHeight: 110, borderRadius: 8, border: "1px dashed var(--border-2)" }} />
                )}
              </div>
            </div>
          )}

          {/* metadata */}
          <dl className="kv">
            <dt>seed</dt>
            <dd className="mono">
              {item.seed} <button className="btn ghost icon xs" onClick={() => copy(String(item.seed), "seed")} aria-label="คัดลอก seed">⧉</button>
            </dd>
            {aspect && (<><dt>aspect ratio</dt><dd>{aspect}</dd></>)}
            {dims && (<><dt>image size</dt><dd className="mono">{dims.w} × {dims.h}</dd></>)}
            <dt>creator</dt>
            <dd className="truncate">{item.creator}</dd>
            <dt>created date</dt>
            <dd>{dateTime(item.created_at)}</dd>
            <dt>file type</dt>
            <dd>{isVideo(item) ? ".mp4" : ".png"}</dd>
          </dl>

          <div className="stack sm" style={{ marginTop: "auto" }}>
            <a
              className="btn primary block"
              href={item.task_uid ? `/api/explore/code/${encodeURIComponent(item.task_uid)}/download` : item.result_url}
              download
            >
              ⬇ ดาวน์โหลด
            </a>
            <Link
              className="btn outline block"
              href={`/studio?${new URLSearchParams({
                ...(item.model_id ? { model: String(item.model_id) } : {}),
                prompt: item.prompt,
                ...(item.negative_prompt ? { negative: item.negative_prompt } : {}),
                seed: String(item.seed),
              })}`}
            >
              ✨ สร้างด้วยค่าเดียวกัน
            </Link>
          </div>
        </div>
      </div>

      {/* related */}
      {data.related.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <h3 className="center" style={{ marginBottom: 16 }}>
            ผลงานอื่นจากโมเดล {item.model_name ?? "นี้"}
          </h3>
          <div className="gallery" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
            {data.related.map((r) => (
              <Link key={r.id} href={r.task_uid ? `/gallery/${r.task_uid}` : "#"} className="tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.thumbnail_url || r.result_url} alt="" loading="lazy" />
                {isVideo(r) && <span className="tag badge info">▶</span>}
                <div className="overlay">
                  <span className="xs truncate">{r.creator}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
