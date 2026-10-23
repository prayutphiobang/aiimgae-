"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { useToast } from "./ui";
import { isFinal, previewUrl } from "@/lib/format";

export interface TrackedJob {
  id: number;
  task_uid: string | null;
  status: string;
  result_url: string | null;
  thumbnail_url: string | null;
  media_type: string;
  error: string | null;
  prompt: string;
  model_name: string | null;
  est_seconds: number | null;
  cost_credit: number;
  created_at: string;
}

interface Ctx {
  jobs: TrackedJob[];
  /** Register a just-submitted job so it is tracked on every page. */
  track: (job: TrackedJob) => void;
  /** Bumps whenever any job finishes — pages can use it to reload lists. */
  version: number;
}

const JobsCtx = createContext<Ctx>({ jobs: [], track: () => {}, version: 0 });
export const useJobs = () => useContext(JobsCtx);

const POLL_MS = 3000;
const DONE_VISIBLE_MS = 15000;

/**
 * Keeps tracking image jobs while the member navigates between pages.
 * - Polls /api/jobs (server also syncs with Mojen and refunds failures).
 * - Restores unfinished jobs after a page reload.
 * - Shows a floating status panel and a toast when each job finishes.
 */
export default function JobsProvider({ children }: { children: React.ReactNode }) {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const path = usePathname();
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [version, setVersion] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const finishedAt = useRef<Map<number, number>>(new Map());
  const jobsRef = useRef<TrackedJob[]>([]);
  jobsRef.current = jobs;

  const poll = useCallback(async () => {
    const ids = jobsRef.current.map((j) => j.id).join(",");
    let items: TrackedJob[];
    try {
      const res = await fetch(`/api/jobs${ids ? `?ids=${ids}` : ""}`, { cache: "no-store" });
      if (!res.ok) return;
      items = (await res.json()).items ?? [];
    } catch {
      return;
    }

    const prev = new Map(jobsRef.current.map((j) => [j.id, j]));
    let anyDone = false;
    for (const it of items) {
      const before = prev.get(it.id);
      if (before && !isFinal(before.status) && isFinal(it.status)) {
        anyDone = true;
        finishedAt.current.set(it.id, Date.now());
        if (it.status === "success") toast(`✅ ภาพเสร็จแล้ว — ${it.model_name ?? ""}`, "success");
        else toast("❌ สร้างภาพไม่สำเร็จ ระบบคืน credit ให้แล้ว", "error");
      }
    }

    // Keep finished jobs visible for a short while, then drop them.
    const now = Date.now();
    const next = items.filter((j) => {
      if (!isFinal(j.status)) return true;
      const t = finishedAt.current.get(j.id);
      return t !== undefined && now - t < DONE_VISIBLE_MS;
    });
    setJobs(next);
    if (anyDone) {
      setVersion((v) => v + 1);
      refresh();
    }
  }, [refresh, toast]);

  // Initial load (restores jobs after reload) + polling while anything is pending.
  useEffect(() => {
    if (!user) {
      setJobs([]);
      return;
    }
    poll();
  }, [user, poll]);

  const hasPending = jobs.some((j) => !isFinal(j.status));
  const hasVisibleDone = jobs.some((j) => isFinal(j.status));
  useEffect(() => {
    if (!user || (!hasPending && !hasVisibleDone)) return;
    const t = setInterval(poll, hasPending ? POLL_MS : 5000);
    return () => clearInterval(t);
  }, [user, hasPending, hasVisibleDone, poll]);

  // Warn before closing the tab while jobs run (they still finish server-side).
  useEffect(() => {
    if (!hasPending) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [hasPending]);

  const track = useCallback((job: TrackedJob) => {
    setJobs((p) => [job, ...p.filter((j) => j.id !== job.id)]);
  }, []);

  // The studio shows its own large progress view; hide the floating panel there.
  const showPanel = jobs.length > 0 && !path.startsWith("/studio");
  const pendingCount = jobs.filter((j) => !isFinal(j.status)).length;

  return (
    <JobsCtx.Provider value={{ jobs, track, version }}>
      {children}
      {showPanel && (
        <aside className="jobs-panel" aria-live="polite" aria-label="งานที่กำลังสร้าง">
          <button className="jobs-head" onClick={() => setCollapsed((v) => !v)} aria-expanded={!collapsed}>
            {pendingCount > 0 ? <span className="spinner" /> : <span>✅</span>}
            <span className="grow">
              {pendingCount > 0 ? `กำลังสร้าง ${pendingCount} ภาพ` : "สร้างภาพเสร็จแล้ว"}
            </span>
            <span className="muted">{collapsed ? "▴" : "▾"}</span>
          </button>
          {!collapsed && (
            <div className="jobs-list">
              {jobs.map((j) => (
                <JobRow key={j.id} job={j} />
              ))}
              <Link href="/gallery" className="btn ghost sm block">
                ดูในแกลเลอรี →
              </Link>
            </div>
          )}
        </aside>
      )}
    </JobsCtx.Provider>
  );
}

function JobRow({ job }: { job: TrackedJob }) {
  const [now, setNow] = useState(Date.now());
  const pending = !isFinal(job.status);
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pending]);

  const elapsed = Math.max(0, Math.floor((now - new Date(job.created_at).getTime()) / 1000));
  const est = job.est_seconds || 90;
  const pct = Math.min(95, (elapsed / est) * 100);

  return (
    <Link href="/gallery" className="job-row">
      <span className="job-thumb">
        {previewUrl(job) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl(job)!} alt="" />
        ) : pending ? (
          <span className="spinner" />
        ) : job.status === "success" ? (
          "🎬"
        ) : (
          "⚠️"
        )}
      </span>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="truncate" style={{ display: "block", fontWeight: 600, fontSize: 13 }}>
          {job.model_name ?? "งานสร้างภาพ"}
        </span>
        {pending ? (
          <>
            <span className="bar" style={{ margin: "5px 0 2px", height: 4 }}>
              <i style={{ width: `${pct}%` }} />
            </span>
            <span className="xs muted">
              {elapsed}s / ~{est}s
            </span>
          </>
        ) : (
          <span className={`xs ${job.status === "success" ? "pos" : "neg"}`}>
            {job.status === "success" ? "สำเร็จ — แตะเพื่อดู" : "ไม่สำเร็จ (คืน credit แล้ว)"}
          </span>
        )}
      </span>
    </Link>
  );
}
