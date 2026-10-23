"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { Empty, api, useToast } from "@/components/ui";
import { dateTime } from "@/lib/format";

interface Ticket {
  id: number;
  subject: string;
  status: "open" | "answered" | "closed";
  last_message_at: string;
  unread_user?: number;
  created_at: string;
}
interface Msg {
  id: number;
  sender: "user" | "admin";
  body: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = { open: "รอตอบกลับ", answered: "ตอบแล้ว", closed: "ปิดแล้ว" };

export default function HelpPage() {
  return (
    <RequireAuth>
      <Help />
    </RequireAuth>
  );
}

function Help() {
  const toast = useToast();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  // new-ticket form
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [firstMsg, setFirstMsg] = useState("");

  const endRef = useRef<HTMLDivElement>(null);

  const loadTickets = useCallback(async () => {
    try {
      const d = await api<{ items: Ticket[] }>("/api/support");
      setTickets(d.items);
    } catch (e: any) {
      toast(e.message, "error");
      setTickets([]);
    }
  }, [toast]);

  const openTicket = useCallback(
    async (id: number) => {
      setActive(id);
      setCreating(false);
      try {
        const d = await api<{ ticket: Ticket; messages: Msg[] }>(`/api/support/${id}`);
        setTicket(d.ticket);
        setMessages(d.messages);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      } catch (e: any) {
        toast(e.message, "error");
      }
    },
    [toast]
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function createTicket() {
    if (!subject.trim() || !firstMsg.trim()) return;
    setBusy(true);
    try {
      const d = await api<{ id: number }>("/api/support", { method: "POST", json: { subject, body: firstMsg } });
      toast("ส่งคำถามแล้ว ทีมงานจะตอบกลับโดยเร็ว", "success");
      setSubject("");
      setFirstMsg("");
      await loadTickets();
      openTicket(d.id);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!reply.trim() || !active) return;
    setBusy(true);
    try {
      await api(`/api/support/${active}`, { method: "POST", json: { body: reply } });
      setReply("");
      await openTicket(active);
      loadTickets();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>ศูนย์ช่วยเหลือ</h1>
          <p>ส่งคำถามถึงทีมงาน เราจะตอบกลับในหน้านี้</p>
        </div>
        <button className="btn primary" onClick={() => { setCreating(true); setActive(null); }}>
          ✉️ ส่งคำถามใหม่
        </button>
      </div>

      <div className="support-layout">
        {/* ticket list */}
        <aside className="support-list card flush">
          {tickets === null ? (
            <div className="stack sm" style={{ padding: 12 }}>
              {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: 20 }}><Empty icon="💬" title="ยังไม่มีคำถาม" /></div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                className={`support-item ${active === t.id ? "active" : ""}`}
                onClick={() => openTicket(t.id)}
              >
                <div className="row between">
                  <span className="truncate" style={{ fontWeight: 600 }}>{t.subject}</span>
                  {!!t.unread_user && <span className="dot-unread" aria-label="มีข้อความใหม่" />}
                </div>
                <div className="row between xs muted">
                  <span className={`badge ${t.status === "answered" ? "success" : t.status === "closed" ? "" : "info"}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                  <span>{dateTime(t.last_message_at)}</span>
                </div>
              </button>
            ))
          )}
        </aside>

        {/* conversation / new ticket */}
        <section className="support-main card">
          {creating ? (
            <div className="stack">
              <h3>ส่งคำถามใหม่</h3>
              <div className="field">
                <label className="label" htmlFor="subj">หัวข้อ</label>
                <input id="subj" className="input" maxLength={200} placeholder="เช่น เติมเงินแล้ว credit ไม่เข้า"
                  value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="field">
                <label className="label" htmlFor="msg">รายละเอียด</label>
                <textarea id="msg" className="textarea" rows={6} maxLength={5000} placeholder="อธิบายปัญหาหรือคำถามของคุณ..."
                  value={firstMsg} onChange={(e) => setFirstMsg(e.target.value)} />
              </div>
              <div className="row end" style={{ gap: 8 }}>
                <button className="btn ghost" onClick={() => setCreating(false)}>ยกเลิก</button>
                <button className="btn primary" disabled={busy || !subject.trim() || !firstMsg.trim()} onClick={createTicket}>
                  {busy ? <span className="spinner" /> : "ส่งคำถาม"}
                </button>
              </div>
            </div>
          ) : ticket ? (
            <div className="chat">
              <div className="chat-head row between">
                <div>
                  <div style={{ fontWeight: 700 }}>{ticket.subject}</div>
                  <div className="xs muted">เปิดเมื่อ {dateTime(ticket.created_at)}</div>
                </div>
                <span className={`badge ${ticket.status === "answered" ? "success" : ticket.status === "closed" ? "" : "info"}`}>
                  {STATUS_LABEL[ticket.status]}
                </span>
              </div>
              <div className="chat-body">
                {messages.map((m) => (
                  <div key={m.id} className={`bubble-row ${m.sender === "user" ? "me" : "them"}`}>
                    <div className="bubble">
                      <div className="bubble-text">{m.body}</div>
                      <div className="bubble-meta xs">{m.sender === "admin" ? "ทีมงาน" : "คุณ"} · {dateTime(m.created_at)}</div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              {ticket.status === "closed" ? (
                <div className="chat-closed xs muted">เรื่องนี้ถูกปิดแล้ว · ส่งคำถามใหม่ได้หากต้องการ</div>
              ) : (
                <div className="chat-input">
                  <textarea
                    className="textarea"
                    rows={2}
                    placeholder="พิมพ์ข้อความ..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(); }}
                  />
                  <button className="btn primary" disabled={busy || !reply.trim()} onClick={sendReply}>
                    {busy ? <span className="spinner" /> : "ส่ง"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Empty icon="💬" title="เลือกเรื่องทางซ้าย หรือส่งคำถามใหม่">
              <button className="btn primary" style={{ marginTop: 12 }} onClick={() => setCreating(true)}>✉️ ส่งคำถามใหม่</button>
            </Empty>
          )}
        </section>
      </div>
    </main>
  );
}
