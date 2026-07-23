"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSession, onAuthStateChange } from "@/lib/auth";

// UX convenience only -- redirects a signed-out visitor to /login so they're
// not staring at an empty/broken screen. The real access control is Postgres
// RLS (owner_id = auth.uid()), which holds regardless of what this component
// does or doesn't render.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

    getSession().then((session) => {
      if (!active) return;
      setSignedIn(!!session);
      setReady(true);
    });

    const unsubscribe = onAuthStateChange((session) => {
      if (!active) return;
      setSignedIn(!!session);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!signedIn && pathname !== "/login") {
      router.replace("/login");
    }
  }, [ready, signedIn, pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!ready || !signedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">جارٍ التحميل...</p>
      </div>
    );
  }

  return <>{children}</>;
}
