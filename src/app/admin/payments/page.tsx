"use client";

import { useCallback, useEffect, useState } from "react";
import { Empty, Pager, api, useDebounced, useToast } from "@/components/ui";
import { PAY_STATUS, dateTime, num, thb } from "@/lib/format";

interface P {
  id: number;
  user_id: number;
  email: string | null;
  package_name: string | null;
  amount_thb: number;
  credit_added: number;
  status: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  created_at: string;
}

export default function AdminPaymentsPage() {
  const toast = useToast();
  const [data, setData] = useState<{ items: P[]; total: number; paid_sum: number } | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set("status", status);
    if (dq) qs.set("q", dq);
    try {
      setData(await api(`/api/admin/payments?${qs}`));
    } catch (e: any) {
      toast(e.message, "error");
    }
  }, [page, status, dq, toast]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [status, dq]);

  return (
    <div className="stack lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>การชำระเงิน</h1>
          <p>
            {num(data?.total ?? 0)} รายการ · ยอดชำระแล้ว (ตามตัวกรอง) <b className="pos">{thb(data?.paid_sum ?? 0, 0)}</b>
          </p>
        </div>
      </div>
      <div className="card flush">
        <div className="filters">
          <input className="input search" placeholder="🔍 อีเมล หรือ Stripe session / payment id..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหา" />
          <div className="tabs">
            {[["", "ทั้งหมด"], ["paid", "ชำระแล้ว"], ["pending", "รอชำระ"], ["failed", "ไม่สำเร็จ"]].map(([v, l]) => (
              <button key={v} className={`tab ${status === v ? "active" : ""}`} onClick={() => setStatus(v)}>{l}</button>
            ))}
          </div>
        </div>
        {!data ? (
          <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 240 }} /></div>
        ) : data.items.length === 0 ? (
          <Empty icon="💳" title="ไม่พบรายการ" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>เลขที่</th><th>ผู้ใช้</th><th>รายการ</th><th className="num">ยอดเงิน</th><th className="num">Credit</th><th>สถานะ</th><th>Stripe</th><th>วันที่</th></tr>
                </thead>
                <tbody>
                  {data.items.map((p) => {
                    const st = PAY_STATUS[p.status] ?? { label: p.status, cls: "" };
                    return (
                      <tr key={p.id}>
                        <td className="mono">#{String(p.id).padStart(6, "0")}</td>
                        <td className="truncate" style={{ maxWidth: 220 }}>{p.email ?? `#${p.user_id}`}</td>
                        <td>{p.package_name ?? "เติมจำนวนอื่น"}</td>
                        <td className="num"><b>{thb(p.amount_thb, 0)}</b></td>
                        <td className="num">+{num(p.credit_added)}</td>
                        <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                        <td className="mono xs muted truncate" style={{ maxWidth: 180 }} title={p.stripe_payment_intent ?? p.stripe_session_id ?? ""}>
                          {p.stripe_payment_intent ?? p.stripe_session_id ?? "-"}
                        </td>
                        <td className="small muted nowrap">{dateTime(p.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={30} total={data.total} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
