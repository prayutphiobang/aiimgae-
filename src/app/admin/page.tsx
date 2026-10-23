"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Chart from "@/components/Chart";
import { Empty, StatusBadge, api } from "@/components/ui";
import { isVideo, num, pct, previewUrl, thb, timeAgo } from "@/lib/format";

interface Stats {
  revenue_thb: number;
  revenue_today: number;
  paid_count: number;
  gens: number;
  gens_today: number;
  failed: number;
  fail_rate: number;
  credit_spent: number;
  coin_used: number;
  earned_thb: number;
  cost_thb: number;
  profit_thb: number;
  margin: number;
  users: number;
  new_users_today: number;
  outstanding_credit: number;
  outstanding_thb: number;
  daily: { day: string; revenue: number; gens: number; profit: number }[];
  top_models: { id: number; name: string; gens: number; profit: number }[];
  recent: {
    id: number;
    email: string;
    model_name: string;
    status: string;
    result_url: string | null;
    thumbnail_url: string | null;
    media_type: string;
    cost_credit: number;
    created_at: string;
  }[];
  rates: { thb_per_credit: number; coin_cost_thb: number };
}

export default function AdminDashboard() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Stats>("/api/admin/stats").then(setS).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="form-error">{err}</div>;
  if (!s)
    return (
      <div className="grid cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 110 }} />
        ))}
      </div>
    );

  const maxGens = Math.max(1, ...s.top_models.map((m) => m.gens));

  return (
    <div className="stack lg">
      <div className="grid cols-4">
        <div className="card stat hl">
          <div className="label">💰 กำไรสุทธิ (ประมาณ)</div>
          <div className="value pos">{thb(s.profit_thb)}</div>
          <div className="sub">Margin {pct(s.margin)} · จากการใช้งานจริง</div>
        </div>
        <div className="card stat">
          <div className="label">💳 รายได้เติมเงิน</div>
          <div className="value">{thb(s.revenue_thb, 0)}</div>
          <div className="sub">วันนี้ {thb(s.revenue_today, 0)} · {num(s.paid_count)} รายการ</div>
        </div>
        <div className="card stat">
          <div className="label">🖼️ ภาพที่สร้าง</div>
          <div className="value">{num(s.gens)}</div>
          <div className="sub">วันนี้ {num(s.gens_today)} · ล้มเหลว {pct(s.fail_rate)}</div>
        </div>
        <div className="card stat">
          <div className="label">👥 ผู้ใช้งาน</div>
          <div className="value">{num(s.users)}</div>
          <div className="sub">ใหม่วันนี้ {num(s.new_users_today)}</div>
        </div>
        <div className="card stat">
          <div className="label">📥 รายได้จากการใช้งาน</div>
          <div className="value">{thb(s.earned_thb)}</div>
          <div className="sub">{num(s.credit_spent)} credit × {s.rates.thb_per_credit} ฿</div>
        </div>
        <div className="card stat">
          <div className="label">📤 ต้นทุน Mojen</div>
          <div className="value">{thb(s.cost_thb)}</div>
          <div className="sub">{num(s.coin_used)} coin × {s.rates.coin_cost_thb} ฿</div>
        </div>
        <div className="card stat">
          <div className="label">🏦 Credit คงค้าง (หนี้สิน)</div>
          <div className="value">{num(s.outstanding_credit)}</div>
          <div className="sub">มูลค่า {thb(s.outstanding_thb)}</div>
        </div>
        <div className="card stat">
          <div className="label">⚠️ งานล้มเหลว</div>
          <div className="value">{num(s.failed)}</div>
          <div className="sub">คืน credit อัตโนมัติแล้ว</div>
        </div>
      </div>

      <div className="grid split-2-1">
        <div className="card">
          <div className="card-head">
            <h3>30 วันล่าสุด</h3>
            <Link href="/admin/reports" className="btn ghost sm">รายงานเต็ม →</Link>
          </div>
          <Chart
            data={s.daily.map((d) => ({ label: d.day.slice(5), bar: d.revenue, line: d.profit }))}
            barLabel="เติมเงิน"
            lineLabel="กำไร"
            format={(n) => thb(n, 0)}
          />
        </div>
        <div className="card">
          <div className="card-head">
            <h3>โมเดลยอดนิยม</h3>
            <Link href="/admin/models" className="btn ghost sm">จัดการ →</Link>
          </div>
          {s.top_models.length === 0 ? (
            <Empty icon="🧩" title="ยังไม่มีการใช้งาน" />
          ) : (
            <div className="hbar">
              {s.top_models.map((m) => (
                <div key={m.id} className="hbar-row">
                  <span className="truncate">{m.name}</span>
                  <span className="small muted">{num(m.gens)} ภาพ · <span className="pos">{thb(m.profit, 0)}</span></span>
                  <div className="track"><i style={{ width: `${(m.gens / maxGens) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card flush">
        <div className="card-head" style={{ padding: "16px 16px 0" }}>
          <h3>กิจกรรมล่าสุด</h3>
          <Link href="/admin/generations" className="btn ghost sm">ดูทั้งหมด →</Link>
        </div>
        {s.recent.length === 0 ? (
          <Empty title="ยังไม่มีกิจกรรม" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th></th><th>ผู้ใช้</th><th>โมเดล</th><th>สถานะ</th><th className="num">Credit</th><th>เวลา</th></tr>
              </thead>
              <tbody>
                {s.recent.map((r) => (
                  <tr key={r.id}>
                    <td style={{ width: 60 }}>
                      {previewUrl(r) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb-sm" src={previewUrl(r)!} alt="" />
                      ) : (
                        <div className="thumb-sm" style={{ display: "grid", placeItems: "center" }}>
                          {isVideo(r) ? "🎬" : ""}
                        </div>
                      )}
                    </td>
                    <td className="truncate" style={{ maxWidth: 220 }}>{r.email}</td>
                    <td>{r.model_name ?? "-"}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="num">{r.cost_credit}</td>
                    <td className="small muted nowrap">{timeAgo(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
