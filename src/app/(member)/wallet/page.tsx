"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { Empty, Modal, Pager, api, useToast } from "@/components/ui";
import EmbeddedCheckout from "@/components/EmbeddedCheckout";
import { PAY_STATUS, TX_TYPE, dateTime, num, thb } from "@/lib/format";

interface Pkg {
  id: number;
  name: string;
  price_thb: number;
  credits: number;
  bonus_credits: number;
  badge: string | null;
}
interface Tx {
  id: number;
  type: string;
  credit_amount: number;
  balance_after: number;
  note: string | null;
  created_at: string;
}
interface Pay {
  id: number;
  amount_thb: number;
  credit_added: number;
  status: string;
  package_name: string | null;
  created_at: string;
}

export default function WalletPage() {
  return (
    <RequireAuth>
      <Suspense>
        <Wallet />
      </Suspense>
    </RequireAuth>
  );
}

function Wallet() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { user, refresh, site } = useAuth();
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [clientSecret, setCheckout] = useState<string | null>(null);
  const [pubKey, setPubKey] = useState("");
  const [tab, setTab] = useState<"tx" | "pay">("tx");
  const [tx, setTx] = useState<{ items: Tx[]; total: number }>({ items: [], total: 0 });
  const [pay, setPay] = useState<{ items: Pay[]; total: number }>({ items: [], total: 0 });
  const [page, setPage] = useState(1);

  useEffect(() => {
    api<{ packages: Pkg[]; publishableKey?: string }>("/api/billing/checkout")
      .then((d) => {
        setPkgs(d.packages);
        setPubKey(d.publishableKey ?? "");
      })
      .catch(() => {});
  }, []);

  // Returning from checkout: confirm the session so credits show up at once.
  useEffect(() => {
    const sid = params.get("session_id");
    if (sid) {
      setCheckout(null);
      api<{ status: string; credit_added?: number }>(`/api/billing/session/${sid}`)
        .then((d) => {
          if (d.status === "paid") toast(`เติม ${num(d.credit_added)} credit สำเร็จ 🎉`, "success");
          else if (d.status === "failed") toast("การชำระเงินไม่สำเร็จ", "error");
          else toast("กำลังตรวจสอบการชำระเงิน...", "info");
          refresh();
          load();
        })
        .catch((e) => toast(e.message, "error"))
        .finally(() => router.replace("/wallet"));
      return;
    }
    const s = params.get("status");
    if (s === "success") {
      toast("ชำระเงินสำเร็จ credit จะเข้าบัญชีภายในไม่กี่วินาที", "success");
      const t1 = setTimeout(refresh, 2000);
      const t2 = setTimeout(refresh, 6000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    if (s === "cancel") toast("ยกเลิกการชำระเงิน", "info");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const load = useCallback(async () => {
    const qs = `?page=${page}&pageSize=15`;
    try {
      if (tab === "tx") setTx(await api(`/api/account/transactions${qs}`));
      else setPay(await api(`/api/account/payments${qs}`));
    } catch {
      /* ignore */
    }
  }, [tab, page]);
  useEffect(() => {
    load();
  }, [load, user?.credit_balance]);

  /** Opens Stripe's form in a modal on this page; falls back to a redirect if needed. */
  async function checkout(body: Record<string, unknown>, key: string) {
    setBusy(key);
    const inline = !!pubKey;
    try {
      const d = await api<{ url: string; clientSecret: string | null }>("/api/billing/checkout", {
        method: "POST",
        json: { ...body, mode: inline ? "embedded" : "hosted" },
      });
      if (inline && d.clientSecret) setCheckout(d.clientSecret);
      else window.location.href = d.url;
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(null);
    }
  }

  const bestId = pkgs.find((p) => p.badge)?.id;

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>กระเป๋าเงิน</h1>
          <p>เติม credit และดูประวัติการใช้งาน</p>
        </div>
      </div>

      <div className="wallet-layout">
        <div className="stack">
          <div className="balance-card">
            <div className="small" style={{ opacity: 0.8 }}>Credit คงเหลือ</div>
            <div className="amount row">
              <span className="coin" style={{ width: 30, height: 30 }} />
              {num(user?.credit_balance)}
            </div>
            <div className="small" style={{ opacity: 0.75, marginTop: 8 }}>
              มูลค่าประมาณ {thb((user?.credit_balance ?? 0) * site.thb_per_credit)}
            </div>
          </div>

          <div className="card stack">
            <h3>วิธีเติม credit</h3>
            <p className="small muted">
              เลือกซื้อแพ็กเกจทางด้านขวา — ยิ่งแพ็กเกจใหญ่ยิ่งได้โบนัส credit เพิ่ม
            </p>
            <div className="summary-line small">
              <span>อัตราแลกเปลี่ยน</span>
              <span style={{ fontWeight: 700 }}>{site.thb_per_credit} บาท / credit</span>
            </div>
          </div>
          <p className="xs muted center">🔒 ชำระเงินอย่างปลอดภัยผ่าน Stripe รองรับบัตรเครดิต/เดบิต และ PromptPay</p>
        </div>

        <div className="stack lg">
          <div>
            <h2 style={{ marginBottom: 16 }}>แพ็กเกจ</h2>
            {pkgs.length === 0 ? (
              <div className="card"><Empty icon="📦" title="ยังไม่มีแพ็กเกจ" /></div>
            ) : (
              <div className="pkg-grid" style={{ paddingTop: 10 }}>
                {pkgs.map((p) => {
                  const total = p.credits + p.bonus_credits;
                  return (
                    <div key={p.id} className={`pkg ${p.id === bestId ? "featured" : ""}`}>
                      {p.badge && <span className="badge hot ribbon">{p.badge}</span>}
                      <div className="xs muted" style={{ fontWeight: 700, textTransform: "uppercase" }}>{p.name}</div>
                      <div className="credits">
                        <span className="coin" style={{ width: 22, height: 22 }} />
                        {num(total)}
                      </div>
                      <div className="bonus">
                        {p.bonus_credits > 0 ? `+${num(p.bonus_credits)} โบนัส (${Math.round((p.bonus_credits / p.credits) * 100)}%)` : ""}
                      </div>
                      <div className="price">{thb(p.price_thb, 0)}</div>
                      <button
                        className="btn primary block"
                        disabled={busy !== null}
                        onClick={() => checkout({ packageId: p.id }, `p${p.id}`)}
                      >
                        {busy === `p${p.id}` ? <span className="spinner" /> : "ซื้อเลย"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card flush">
            <div className="card-head" style={{ padding: "16px 16px 0", marginBottom: 12 }}>
              <h3>ประวัติ</h3>
              <div className="tabs">
                <button className={`tab ${tab === "tx" ? "active" : ""}`} onClick={() => { setTab("tx"); setPage(1); }}>
                  ธุรกรรม credit
                </button>
                <button className={`tab ${tab === "pay" ? "active" : ""}`} onClick={() => { setTab("pay"); setPage(1); }}>
                  ใบเสร็จ
                </button>
              </div>
            </div>
            <div className="table-wrap">
              {tab === "tx" ? (
                tx.items.length === 0 ? (
                  <Empty icon="🧾" title="ยังไม่มีธุรกรรม" />
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>วันที่</th>
                        <th>ประเภท</th>
                        <th>รายละเอียด</th>
                        <th className="num">จำนวน</th>
                        <th className="num">คงเหลือ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tx.items.map((t) => {
                        const ty = TX_TYPE[t.type] ?? { label: t.type, cls: "" };
                        return (
                          <tr key={t.id}>
                            <td className="nowrap small">{dateTime(t.created_at)}</td>
                            <td><span className={`badge ${ty.cls}`}>{ty.label}</span></td>
                            <td className="small muted">{t.note ?? "-"}</td>
                            <td className={`num ${t.credit_amount >= 0 ? "pos" : "neg"}`} style={{ fontWeight: 700 }}>
                              {t.credit_amount >= 0 ? "+" : ""}
                              {num(t.credit_amount)}
                            </td>
                            <td className="num">{num(t.balance_after)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : pay.items.length === 0 ? (
                <Empty icon="🧾" title="ยังไม่มีการชำระเงิน" />
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>เลขที่</th>
                      <th>วันที่</th>
                      <th>รายการ</th>
                      <th className="num">ยอดเงิน</th>
                      <th className="num">Credit</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pay.items.map((p) => {
                      const st = PAY_STATUS[p.status] ?? { label: p.status, cls: "" };
                      return (
                        <tr key={p.id}>
                          <td className="mono">#{String(p.id).padStart(6, "0")}</td>
                          <td className="nowrap small">{dateTime(p.created_at)}</td>
                          <td>{p.package_name ?? "เติมจำนวนอื่น"}</td>
                          <td className="num">{thb(p.amount_thb, 0)}</td>
                          <td className="num">+{num(p.credit_added)}</td>
                          <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {(tab === "tx" ? tx.total : pay.total) > 15 && (
              <Pager page={page} pageSize={15} total={tab === "tx" ? tx.total : pay.total} onPage={setPage} />
            )}
          </div>
        </div>
      </div>

      {/* Pay without leaving the site. */}
      <Modal
        open={!!clientSecret}
        onClose={() => setCheckout(null)}
        title="ชำระเงิน"
        size="lg"
      >
        {clientSecret && (
          <>
            <EmbeddedCheckout clientSecret={clientSecret} publishableKey={pubKey} />
            <p className="xs muted center" style={{ marginTop: 14 }}>
              🔒 ชำระเงินอย่างปลอดภัยผ่าน Stripe · ข้อมูลบัตรไม่ผ่านเซิร์ฟเวอร์ของเรา
            </p>
          </>
        )}
      </Modal>
    </main>
  );
}
