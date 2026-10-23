"use client";

import { useState } from "react";

export interface Point {
  label: string;
  bar: number;
  line: number;
}

/**
 * Lightweight dependency-free SVG chart: bars (e.g. revenue) + line (e.g. profit).
 */
export default function Chart({
  data,
  barLabel,
  lineLabel,
  format = (n) => n.toLocaleString(),
}: {
  data: Point[];
  barLabel: string;
  lineLabel: string;
  format?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = 220;
  const pad = { l: 8, r: 8, t: 14, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = Math.max(1, ...data.map((d) => Math.max(d.bar, d.line)));
  const min = Math.min(0, ...data.map((d) => d.line));
  const span = max - min || 1;
  const y = (v: number) => pad.t + ih - ((v - min) / span) * ih;
  const step = iw / Math.max(1, data.length);
  const bw = Math.max(2, step * 0.62);

  const line = data
    .map((d, i) => `${i ? "L" : "M"}${pad.l + step * i + step / 2},${y(d.line)}`)
    .join(" ");

  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="row between" style={{ marginBottom: 8 }}>
        <div className="chart-legend">
          <span>
            <i style={{ background: "#5a6cff" }} />
            {barLabel}
          </span>
          <span>
            <i style={{ background: "#3ad6c2" }} />
            {lineLabel}
          </span>
        </div>
        <div className="small muted" style={{ minHeight: 20 }}>
          {h ? (
            <>
              <b style={{ color: "var(--text)" }}>{h.label}</b> · {barLabel} {format(h.bar)} · {lineLabel}{" "}
              {format(h.line)}
            </>
          ) : (
            "ชี้ที่กราฟเพื่อดูรายละเอียด"
          )}
        </div>
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="barG" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7c6cff" />
            <stop offset="100%" stopColor="#4a5be0" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + ih * f} y2={pad.t + ih * f} stroke="#232838" />
        ))}
        {min < 0 && <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="#3a4156" />}
        {data.map((d, i) => (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={pad.l + step * i} y={pad.t} width={step} height={ih} fill="transparent" />
            <rect
              x={pad.l + step * i + (step - bw) / 2}
              y={y(Math.max(0, d.bar))}
              width={bw}
              height={Math.max(0, y(0) - y(Math.max(0, d.bar)))}
              rx={3}
              fill="url(#barG)"
              opacity={hover === null || hover === i ? 1 : 0.45}
            />
          </g>
        ))}
        <path d={line} fill="none" stroke="#3ad6c2" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
        {data.map((d, i) =>
          i % Math.ceil(data.length / 8) === 0 ? (
            <text key={i} x={pad.l + step * i + step / 2} y={H - 6} fill="#6b7389" fontSize="11" textAnchor="middle">
              {d.label}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}
