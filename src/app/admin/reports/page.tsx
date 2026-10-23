"use client";

import { useCallback, useEffect, useState } from "react";
import Chart from "@/components/Chart";
import { Empty, api, useToast } from "@/components/ui";
import { num, pct, thb } from "@/lib/format";

interface Row {
  label: string;
  gens: number;
  credit: number;
  coin: number;
  revenue: number;
  cost: number;
  profit: number;
  topup_thb: number | null;
}
interface Report {
  items: Row[];
  total: { gens: number; revenue: number; cost: number; profit: number };
  rates: { thb_per_credit: number; coin_cost_thb: number };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function AdminReportsPage() {
  const toast = useToast();
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(iso(new Date()));
  const [group, setGroup] = useState<"day" | "model">("day");
  const [data, setData] = useState<Report | null>(null);

  const load = useCallback(async () => {
    setData(null);
    try {
      setData(await api(`/api/admin/reports?${new URLSearchParams({ from, to, group })}`));
    } catch (e: any) {
      toast(e.message, "error");
    }
  }, [from, to, group, toast]);
  useEffect(() => {
    load();
  }, [load]);

  function preset(days: number) {
    setFrom(iso(new Date(Date.now() - (days - 1) * 86400000)));
    setTo(iso(new Date()));
  }

  const csvHref = `/api/admin/reports?${new URLSearchParams({ from, to, group, format: "csv" })}`;
  const margin = data && data.total.revenue ? data.total.profit / data.total.revenue : 0;

  return (
    <div className="stack lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>รายงานกำไร</h1>
          <p>
            คำนวณจากการใช้งานจริง (ไม่รวมงานที่คืน credit) · 1 credit = {data?.rates.thb_per_credit ?? "-"} ฿ · 1 coin ={" "}
            {data?.rates.coin_cost_thb ?? "-"} ฿
          </p>
        </div>
        <a className="btn outline" href={csvHref}>⬇ ส่งออก CSV</a>
      </div>

      <div className="card row wrap" style={{ gap: 12 }}>
        <div className="tabs">
          <button className={`tab ${group === "day" ? "active" : ""}`} onClick={() => setGroup("day")}>รายวัน</button>
          <button className={`tab ${group === "model" ? "active" : ""}`} onClick={() => setGroup("model")}>รายโมเดล</button>
        </div>
        <div className="row">
          <input className="input sm" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="ตั้งแต่" />
          <span className="muted">ถึง</span>
          <input className="input sm" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="ถึง" />
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn ghost sm" onClick={() => preset(7)}>7 วัน</button>
          <button className="btn ghost sm" onClick={() => preset(30)}>30 วัน</button>
          <button className="btn ghost sm" onClick={() => preset(90)}>90 วัน</button>
        </div>
      </div>

      {data && (
        <div className="grid cols-4">
          <div className="card stat"><div className="label">จำนวนภาพ</div><div className="value">{num(data.total.gens)}</div></div>
          <div className="card stat"><div className="label">รายได้</div><div className="value">{thb(data.total.revenue)}</div></div>
          <div className="card stat"><div className="label">ต้นทุน</div><div className="value">{thb(data.total.cost)}</div></div>
          <div className="card stat hl"><div className="label">กำไร</div><div className="value pos">{thb(data.total.profit)}</div><div className="sub">Margin {pct(margin)}</div></div>
        </div>
      )}

      {data && group === "day" && data.items.length > 0 && (
        <div className="card">
          <Chart
            data={data.items.map((r) => ({ label: r.label.slice(5), bar: r.revenue, line: r.profit }))}
            barLabel="รายได้"
            lineLabel="กำไร"
            format={(n) => thb(n, 0)}
          />
        </div>
      )}

      <div className="card flush">
        {!data ? (
          <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 240 }} /></div>
        ) : data.items.length === 0 ? (
          <Empty icon="📈" title="ไม่มีข้อมูลในช่วงนี้" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{group === "day" ? "วันที่" : "โมเดล"}</th>
                  <th className="num">ภาพ</th>
                  <th className="num">Credit</th>
                  <th className="num">Coin</th>
                  <th className="num">รายได้</th>
                  <th className="num">ต้นทุน</th>
                  <th className="num">กำไร</th>
                  {group === "day" && <th className="num">เงินเติมเข้า</th>}
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td className="num">{num(r.gens)}</td>
                    <td className="num">{num(r.credit)}</td>
                    <td className="num">{num(r.coin)}</td>
                    <td className="num">{thb(r.revenue)}</td>
                    <td className="num">{thb(r.cost)}</td>
                    <td className={`num ${r.profit >= 0 ? "pos" : "neg"}`}><b>{thb(r.profit)}</b></td>
                    {group === "day" && <td className="num muted">{thb(r.topup_thb ?? 0, 0)}</td>}
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
