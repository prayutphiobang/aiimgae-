"use client";

import Link from "next/link";

export interface PublicModel {
  id: number;
  feature_uid: string;
  name: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  badge: string | null;
  instruction: string | null;
  supports_prompt: boolean;
  supports_image: boolean;
  requires_image: boolean;
  supports_negative: boolean;
  supports_image2: boolean;
  requires_image2: boolean;
  image_label: string | null;
  image2_label: string | null;
  output_type: "image" | "video";
  prompt_max_len: number;
  est_seconds: number;
  default_prompt: string | null;
  default_negative: string | null;
  price: number;
}

export default function ModelCard({
  model,
  selected,
  onClick,
  href,
}: {
  model: PublicModel;
  selected?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const inner = <CardInner model={model} selected={selected} />;
  if (href) {
    return (
      <Link href={href} className="model-card">
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={`model-card ${selected ? "selected" : ""}`} onClick={onClick} aria-pressed={selected}>
      {inner}
    </button>
  );
}

function CardInner({ model, selected }: { model: PublicModel; selected?: boolean }) {
  return (
    <>
      <div
        className="cover"
        style={model.thumbnail_url ? { backgroundImage: `url("${model.thumbnail_url}")` } : undefined}
      >
        {!model.thumbnail_url && <div className="cover-fallback">✦</div>}
        {model.badge && <span className={`badge ${/hot|new|ใหม่/i.test(model.badge) ? "hot" : "info"}`}>{model.badge}</span>}
        {selected && <span className="check">✓</span>}
      </div>
      <div className="body">
        <h3 className="truncate">{model.name}</h3>
        {model.category && <div className="xs muted">{model.category}</div>}
        {model.description && (
          <p
            className="small muted"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {model.description}
          </p>
        )}
        <div className="meta">
          <span className="price-tag">
            <span className="coin" aria-hidden /> {model.price} <span className="xs muted">credit</span>
          </span>
          <span>⏱ ~{model.est_seconds}s</span>
        </div>
      </div>
    </>
  );
}
