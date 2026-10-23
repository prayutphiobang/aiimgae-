"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { genStatus } from "@/lib/format";

/* ---------------- fetch helper ---------------- */

export async function api<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    cache: "no-store",
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `เกิดข้อผิดพลาด (${res.status})`);
  return data as T;
}

/* ---------------- toasts ---------------- */

type Toast = { id: number; msg: string; kind: "success" | "error" | "info" };
const ToastCtx = createContext<(msg: string, kind?: Toast["kind"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((msg: string, kind: Toast["kind"] = "info") => {
    const id = ++seq.current;
    setItems((p) => [...p, { id, msg, kind }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- modal ---------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size ?? ""}`} role="dialog" aria-modal="true">
        {title !== undefined && (
          <div className="modal-head">
            <h3>{title}</h3>
            <button className="btn ghost icon" onClick={onClose} aria-label="ปิด">
              ✕
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- confirm ---------------- */

export function useConfirm() {
  const [state, setState] = useState<{ msg: ReactNode; resolve: (v: boolean) => void; danger?: boolean } | null>(
    null
  );
  const confirm = useCallback(
    (msg: ReactNode, danger = false) => new Promise<boolean>((resolve) => setState({ msg, resolve, danger })),
    []
  );
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const node = (
    <Modal
      open={!!state}
      onClose={() => close(false)}
      title="ยืนยันการทำรายการ"
      footer={
        <>
          <button className="btn outline" onClick={() => close(false)}>
            ยกเลิก
          </button>
          <button className={`btn ${state?.danger ? "danger" : "primary"}`} onClick={() => close(true)}>
            ยืนยัน
          </button>
        </>
      }
    >
      {state?.msg}
    </Modal>
  );
  return { confirm, node };
}

/* ---------------- small pieces ---------------- */

export function StatusBadge({ status }: { status: string }) {
  const s = genStatus(status);
  return (
    <span className={`badge ${s.cls}`}>
      <span className={`dot ${s.cls === "info" ? "pulse" : ""}`} />
      {s.label}
    </span>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="pager">
      <span>
        {from}-{to} จาก {total.toLocaleString()} รายการ
      </span>
      <div className="row">
        <button className="btn sm outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ‹ ก่อนหน้า
        </button>
        <span>
          {page} / {pages}
        </span>
        <button className="btn sm outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          ถัดไป ›
        </button>
      </div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
}) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      {label}
    </label>
  );
}

export function Empty({ icon = "🖼️", title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      {children && <div className="small">{children}</div>}
    </div>
  );
}

export function Avatar({ src, name, size }: { src?: string | null; name?: string | null; size?: "sm" | "lg" }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`avatar ${size ?? ""}`} src={src} alt="" referrerPolicy="no-referrer" />;
  }
  return <span className={`avatar ${size ?? ""}`}>{(name ?? "?").trim().charAt(0).toUpperCase()}</span>;
}

/** Debounced value (for search boxes). */
export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Upload an image file through /api/upload. */
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "อัปโหลดไม่สำเร็จ");
  return data.url as string;
}
