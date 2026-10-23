"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

/**
 * Gate for the whole (member) route group.
 *
 * Only the landing page ("/") is public. Every other member page requires a
 * logged-in user; visitors are redirected to /login. This replaces the need to
 * wrap each individual page with RequireAuth and closes gaps like /explore.
 */
const PUBLIC_PATHS = new Set<string>(["/"]);

export default function MemberGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  const isPublic = PUBLIC_PATHS.has(path);

  useEffect(() => {
    if (loading || isPublic) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [loading, user, isPublic, path, router]);

  // Public pages render immediately. Protected pages wait for auth.
  if (isPublic) return <>{children}</>;
  if (loading || !user) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <span className="spinner lg" aria-label="กำลังโหลด" />
      </div>
    );
  }
  return <>{children}</>;
}
