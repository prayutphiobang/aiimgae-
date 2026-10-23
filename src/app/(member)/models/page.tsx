"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ModelCard, { type PublicModel } from "@/components/ModelCard";
import { Empty } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";

export default function ModelsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [models, setModels] = useState<PublicModel[] | null>(null);
  const [cat, setCat] = useState("ทั้งหมด");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/models").then((r) => r.json()).then((d) => setModels(d.items ?? [])).catch(() => setModels([]));
  }, []);

  const cats = useMemo(
    () => ["ทั้งหมด", ...Array.from(new Set((models ?? []).map((m) => m.category).filter(Boolean) as string[]))],
    [models]
  );
  const list = (models ?? []).filter(
    (m) =>
      (cat === "ทั้งหมด" || m.category === cat) &&
      (!q || `${m.name} ${m.description ?? ""}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>โมเดลทั้งหมด</h1>
          <p>เลือกโมเดลแล้วเริ่มสร้างภาพได้ทันที</p>
        </div>
        <input
          className="input"
          style={{ maxWidth: 300 }}
          placeholder="🔍 ค้นหาโมเดล..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="ค้นหาโมเดล"
        />
      </div>

      {cats.length > 2 && (
        <div className="tabs" style={{ marginBottom: 20, flexWrap: "wrap" }}>
          {cats.map((c) => (
            <button key={c} className={`tab ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {models === null ? (
        <div className="model-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: 290 }} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Empty icon="🧩" title="ไม่พบโมเดล" />
      ) : (
        <div className="model-grid">
          {list.map((m) => (
            <ModelCard
              key={m.id}
              model={m}
              onClick={() => router.push(user ? `/studio?model=${m.id}` : "/login?mode=register")}
            />
          ))}
        </div>
      )}
    </main>
  );
}
