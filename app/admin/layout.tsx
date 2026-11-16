"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLink from "@/components/AppLink";
import { useAuth } from "@/lib/store";
import { adminFetch } from "@/lib/admin-client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=%2Fadmin%2Fproduct-health");
      return;
    }
    let active = true;
    void adminFetch<{ admin: boolean }>("/api/admin/me")
      .then(() => {
        if (active) {
          setAllowed(true);
          setChecking(false);
        }
      })
      .catch(() => {
        if (active) {
          setAllowed(false);
          setChecking(false);
          router.replace("/");
        }
      });
    return () => {
      active = false;
    };
  }, [user, loading, router]);

  if (loading || checking || !allowed) {
    return (
      <div className="section container" style={{ paddingBlock: "6rem" }}>
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-shell__bar">
        <div className="container admin-shell__bar-inner">
          <AppLink href="/admin/product-health" className="admin-shell__brand">
            Veytra Admin
          </AppLink>
          <nav className="admin-shell__nav" aria-label="Admin">
            <AppLink href="/admin/product-health">Product Health</AppLink>
            <AppLink href="/">Storefront</AppLink>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
