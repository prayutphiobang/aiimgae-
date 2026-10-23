"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type PublicModel } from "@/components/ModelCard";
import { Empty, useToast } from "@/components/ui";

interface GalleryItem {
  id: number;
  task_uid: string | null;
  result_url: string | null;
  thumbnail_url: string | null;
  media_type: string;
  prompt: string;
}

export default function FeatureDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [model, setModel] = useState<PublicModel | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");

  useEffect(() => {
    let alive = true;
    fetch(`/api/models/${encodeURIComponent(uid)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => {
        if (!alive) return;
        setModel(d.model);
        setGallery(d.gallery ?? []);
        setState("ready");
      })
      .catch(() => {
        if (alive) setState("notfound");
      });
    return () => {
      alive = false;
    };
  }, [uid]);

  if (state === "loading") {
    return (
      <main className="container">
        <div className="feat-detail">
          <div className="skeleton" style={{ aspectRatio: "1/1", borderRadius: 16 }} />
          <div className="stack">
            <div className="skeleton" style={{ height: 32, width: "60%" }} />
            <div className="skeleton" style={{ height: 80 }} />
            <div className="skeleton" style={{ height: 120 }} />
          </div>
        </div>
      </main>
    );
  }

  if (state === "notfound" || !model) {
    return (
      <main className="container">
        <Empty icon="🧩" title="ไม่พบโมเดลนี้">
          <Link href="/features" className="btn primary" style={{ marginTop: 14 }}>
            ← กลับไปหน้า Features
          </Link>
        </Empty>
      </main>
    );
  }

  const typeLabel = model.output_type === "video" ? "🎬 Text/Image to Video" : model.supports_image ? "img2img" : "txt2img";

  return (
    <main className="container">
      <div className="row between" style={{ marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <Link href="/features" className="btn ghost sm">
          ← Features
        </Link>
        <Link href="/features" className="btn outline sm">
          🔄 เปลี่ยนโมเดล
        </Link>
      </div>

      <div className="feat-detail">
        {/* preview */}
        <div
          className="feat-hero"
          style={model.thumbnail_url ? { backgroundImage: `url("${model.thumbnail_url}")` } : undefined}
        >
          {!model.thumbnail_url && <span className="cover-fallback" style={{ fontSize: 48 }}>✦</span>}
          {model.badge && (
            <span className={`badge ${/hot|new|ใหม่/i.test(model.badge) ? "hot" : "info"} feat-badge`}>{model.badge}</span>
          )}
        </div>

        {/* info */}
        <div className="stack">
          <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
            <h1 style={{ margin: 0 }}>{model.name}</h1>
            <span className="feat-price lg">
              <span className="coin" aria-hidden /> {model.price} <span className="xs muted">credit</span>
            </span>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="badge info">{typeLabel}</span>
            {model.category && <span className="badge">{model.category}</span>}
            <span className="badge">⏱ ~{model.est_seconds}s</span>
          </div>

          {model.description && (
            <div>
              <div className="label" style={{ marginBottom: 6 }}>description</div>
              <p className="muted" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{model.description}</p>
            </div>
          )}

          {model.instruction && (
            <div>
              <div className="label" style={{ marginBottom: 6 }}>instruction</div>
              <div className="instruction" style={{ whiteSpace: "pre-wrap" }}>💡 {model.instruction}</div>
            </div>
          )}

          <div className="stack sm" style={{ marginTop: "auto" }}>
            <button
              className="btn primary block lg"
              onClick={() => router.push(`/studio?model=${model.id}`)}
            >
              ✨ เริ่มสร้างด้วยโมเดลนี้
            </button>
            <button
              className="btn outline block"
              onClick={() => {
                navigator.clipboard?.writeText(model.feature_uid).then(
                  () => toast("คัดลอก feature_uid แล้ว", "success"),
                  () => {}
                );
              }}
            >
              ⧉ คัดลอก feature_uid
            </button>
          </div>
        </div>
      </div>

      {/* sample gallery */}
      <h2 style={{ marginTop: 36, marginBottom: 14 }}>gallery</h2>
      {gallery.length === 0 ? (
        <p className="muted center" style={{ padding: 30 }}>ยังไม่มีผลงานสาธารณะของโมเดลนี้</p>
      ) : (
        <div className="gallery">
          {gallery.map((g) => (
            <Link
              key={g.id}
              href={g.task_uid ? `/gallery/${g.task_uid}` : "#"}
              className="tile"
              title={g.prompt || "ผลงาน"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.thumbnail_url || g.result_url || ""} alt={g.prompt || ""} loading="lazy" />
              {g.media_type === "video" && <span className="tag badge info">▶ วิดีโอ</span>}
              {g.prompt && (
                <div className="overlay">
                  <span className="truncate">{g.prompt}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
