"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

/** Client-side guard: redirects to /login (or home for non-admins) while showing a loader. */
export default function RequireAuth({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  const allowed = !!user && (!admin || user.role === "admin");

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(path)}`);
    else if (admin && user.role !== "admin") router.replace("/studio");
  }, [loading, user, admin, router, path]);

  if (loading || !allowed) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <span className="spinner lg" aria-label="กำลังโหลด" />
      </div>
    );
  }
  return <>{children}</>;
}
