"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, Empty, api, useDebounced, useToast } from "@/components/ui";
import { dateTime } from "@/lib/format";

interface Ticket {
  id: number;
  subject: string;
  status: "open" | "answered" | "closed";
  last_message_at: string;
  unread_admin: number;
  created_at: string;
  user_id: number;
  email: string;
  creator: string;
  avatar_url: string | null;
  credit_balance?: number;
}
interface Msg {
  id: number;
  sender: "user" | "admin";
  body: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = { open: "รอตอบกลับ", answered: "ตอบแล้ว", closed: "ปิดแล้ว" };

export default function AdminSupportPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [active, setActive] = useState<number | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (dq) qs.set("q", dq);
    try {
      const d = await api<{ items: Ticket[] }>(`/api/admin/support?${qs}`);
      setTickets(d.items);
    } catch (e: any) {
      toast(e.message, "error");
      setTickets([]);
    }
  }, [status, dq, toast]);

  const openTicket = useCallback(
    async (id: number) => {
      setActive(id);
      try {
        const d = await api<{ ticket: Ticket; messages: Msg[] }>(`/api/admin/support/${id}`);
        setTicket(d.ticket);
        setMessages(d.messages);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        load();
      } catch (e: any) {
        toast(e.message, "error");
      }
    },
    [toast, load]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function sendReply() {
    if (!reply.trim() || !active) return;
    setBusy(true);
    try {
      await api(`/api/admin/support/${active}`, { method: "POST", json: { body: reply } });
      setReply("");
      await openTicket(active);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function setStatusOf(s: string) {
    if (!active) return;
    try {
      await api(`/api/admin/support/${active}`, { method: "PATCH", json: { status: s } });
      await openTicket(active);
      toast("อัปเดตสถานะแล้ว", "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <div className="stack">
      <div className="row between wrap" style={{ gap: 10 }}>
        <div className="tabs">
          {[["", "ทั้งหมด"], ["open", "รอตอบกลับ"], ["answered", "ตอบแล้ว"], ["closed", "ปิดแล้ว"]].map(([v, l]) => (
            <button key={v} className={`tab ${status === v ? "active" : ""}`} onClick={() => setStatus(v)}>{l}</button>
          ))}
        </div>
        <input className="input" style={{ maxWidth: 280 }} placeholder="🔍 ค้นหาหัวข้อหรือผู้ใช้..."
          value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="support-layout">
        <aside className="support-list card flush">
          {tickets === null ? (
            <div className="stack sm" style={{ padding: 12 }}>{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 60 }} />)}</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: 20 }}><Empty icon="💬" title="ไม่พบเรื่อง" /></div>
          ) : (
            tickets.map((t) => (
              <button key={t.id} className={`support-item ${active === t.id ? "active" : ""}`} onClick={() => openTicket(t.id)}>
                <div className="row between">
                  <span className="truncate" style={{ fontWeight: 600 }}>{t.subject}</span>
                  {!!t.unread_admin && <span className="dot-unread" aria-label="ใหม่" />}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <Avatar src={t.avatar_url} name={t.creator} size="sm" />
                  <span className="xs truncate grow">{t.creator}</span>
                  <span className={`badge ${t.status === "answered" ? "success" : t.status === "closed" ? "" : "info"}`}>{STATUS_LABEL[t.status]}</span>
                </div>
              </button>
            ))
          )}
        </aside>

        <section className="support-main card">
          {ticket ? (
            <div className="chat">
              <div className="chat-head row between wrap" style={{ gap: 8 }}>
                <div className="row" style={{ gap: 10, minWidth: 0 }}>
                  <Avatar src={ticket.avatar_url} name={ticket.creator} />
                  <div style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 700 }}>{ticket.subject}</div>
                    <div className="xs muted truncate">{ticket.creator} · {ticket.email} · {ticket.credit_balance ?? 0} credit</div>
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {ticket.status !== "closed" ? (
                    <button className="btn outline sm" onClick={() => setStatusOf("closed")}>ปิดเรื่อง</button>
                  ) : (
                    <button className="btn outline sm" onClick={() => setStatusOf("open")}>เปิดใหม่</button>
                  )}
                </div>
              </div>
              <div className="chat-body">
                {messages.map((m) => (
                  <div key={m.id} className={`bubble-row ${m.sender === "admin" ? "me" : "them"}`}>
                    <div className="bubble">
                      <div className="bubble-text">{m.body}</div>
                      <div className="bubble-meta xs">{m.sender === "admin" ? "ทีมงาน" : ticket.creator} · {dateTime(m.created_at)}</div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="chat-input">
                <textarea className="textarea" rows={2} placeholder="พิมพ์คำตอบ... (Ctrl+Enter ส่ง)"
                  value={reply} onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(); }} />
                <button className="btn primary" disabled={busy || !reply.trim()} onClick={sendReply}>
                  {busy ? <span className="spinner" /> : "ตอบกลับ"}
                </button>
              </div>
            </div>
          ) : (
            <Empty icon="💬" title="เลือกเรื่องทางซ้ายเพื่อตอบกลับ" />
          )}
        </section>
      </div>
    </div>
  );
}
