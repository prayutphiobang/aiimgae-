"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar, Modal, api, useToast } from "@/components/ui";
import { dateTime, isVideo, num, previewUrl } from "@/lib/format";
import { textToParts } from "@/lib/promptParts";
import type { ExploreItem } from "@/app/(member)/explore/page";

interface Related {
  id: number;
  result_url: string;
  thumbnail_url: string | null;
  media_type: string;
  creator: string;
  avatar_url: string | null;
}

/** Full-screen view of one public item, mirroring Mojen's detail layout. */
export default function ExploreViewer({
  id,
  onClose,
  onOpen,
}: {
  id: number | null;
  onClose: () => void;
  onOpen: (id: number) => void;
}) {
  const toast = useToast();
  const [data, setData] = useState<{ item: ExploreItem; related: Related[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id === null) {
      setData(null);
      return;
    }
    setLoading(true);
    api<{ item: ExploreItem; related: Related[] }>(`/api/explore/${id}`)
      .then(setData)
      .catch((e) => {
        toast(e.message, "error");
        onClose();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`คัดลอก${what}แล้ว`, "success");
    } catch {
      toast("คัดลอกไม่สำเร็จ", "error");
    }
  }

  const item = data?.item;
  const promptParts = textToParts(item?.prompt);
  const negParts = textToParts(item?.negative_prompt);

  return (
    <Modal open={id !== null} onClose={onClose} size="xl">
      {loading && !item ? (
        <div className="center" style={{ padding: 60 }}>
          <span className="spinner lg" />
        </div>
      ) : item ? (
        <div style={{ margin: -22 }}>
          <div className="viewer">
            <div className="img">
              {isVideo(item) ? (
                <video
                  key={item.id}
                  src={item.result_url}
                  poster={item.thumbnail_url ?? undefined}
                  controls
                  autoPlay
                  loop
                  playsInline
                  style={{ maxHeight: "72vh" }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.result_url} alt={item.prompt} />
              )}
            </div>

            <div className="side">
              <div className="row between">
                <span className="row" style={{ gap: 8 }}>
                  <span className="badge">{isVideo(item) ? "🎬 วิดีโอ" : "🖼 รูป"}</span>
                  <span className="badge">👁 {num(item.views)}</span>
                </span>
                <button className="btn ghost icon" onClick={onClose} aria-label="ปิด">
                  ✕
                </button>
              </div>

              {/* model card */}
              <div className="row" style={{ gap: 12 }}>
                {item.model_thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.model_thumb}
                    alt=""
                    style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }}
                  />
                ) : (
                  <div className="thumb-sm" style={{ width: 64, height: 64 }} />
                )}
                <div className="grow" style={{ minWidth: 0 }}>
                  <h3 className="truncate">{item.model_name ?? "-"}</h3>
                  {item.model_id && (
                    <Link href={`/studio?model=${item.model_id}`} className="small" style={{ color: "var(--primary)" }}>
                      ใช้โมเดลนี้สร้างภาพ →
                    </Link>
                  )}
                </div>
              </div>

              {/* prompts as weighted chips, read-only */}
              {promptParts.length > 0 && (
                <div>
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <span className="label">positive prompt</span>
                    <button className="btn ghost sm" onClick={() => copy(item.prompt, "prompt")}>
                      ⧉ คัดลอก
                    </button>
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

              {negParts.length > 0 && (
                <div>
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <span className="label">negative prompt</span>
                    <button className="btn ghost sm" onClick={() => copy(item.negative_prompt ?? "", "negative prompt")}>
                      ⧉ คัดลอก
                    </button>
                  </div>
                  <div className="chips-view">
                    {negParts.map((p, i) => (
                      <span className="chip-ro red" key={i}>
                        <span className="chip-ro-text">{p.text}</span>
                        <span className="chip-ro-w">{p.weight.toFixed(1)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(item.img_ref || item.img_ref2) && (
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>
                    รูปอ้างอิง
                  </div>
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

              <dl className="kv">
                <dt>seed</dt>
                <dd className="mono">
                  {item.seed}{" "}
                  <button className="btn ghost sm" onClick={() => copy(String(item.seed), "seed")}>
                    ⧉
                  </button>
                </dd>
                <dt>ผู้สร้าง</dt>
                <dd>
                  <span className="row" style={{ gap: 6 }}>
                    <Avatar src={item.avatar_url} name={item.creator} size="sm" />
                    <span className="truncate">{item.creator}</span>
                  </span>
                </dd>
                <dt>วันที่สร้าง</dt>
                <dd>{dateTime(item.created_at)}</dd>
                <dt>ชนิดไฟล์</dt>
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
                {item.task_uid && (
                  <Link className="btn outline block" href={`/gallery/${item.task_uid}`}>
                    🔗 เปิดหน้ารายละเอียด
                  </Link>
                )}
                <Link
                  className="btn outline block"
                  href={`/studio?${new URLSearchParams({
                    ...(item.model_id ? { model: String(item.model_id) } : {}),
                    prompt: item.prompt,
                    seed: String(item.seed),
                  })}`}
                >
                  ✨ สร้างด้วยค่าเดียวกัน
                </Link>
              </div>
            </div>
          </div>

          {data.related.length > 0 && (
            <div style={{ padding: "28px 22px" }}>
              <h3 className="center" style={{ marginBottom: 16 }}>
                คุณอาจชอบสิ่งนี้
              </h3>
              <div className="gallery" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                {data.related.map((r) => (
                  <button key={r.id} className="tile" onClick={() => onOpen(r.id)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl(r) ?? r.result_url} alt="" loading="lazy" />
                    {isVideo(r) && <span className="tag badge info">▶</span>}
                    <div className="overlay">
                      <span className="xs truncate">{r.creator}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
