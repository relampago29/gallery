"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import CardAuth from "@/components/ui/auth/CardAuth";
import { useRouter } from "next/navigation";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  // Optional: allow redirect mode via env without changing code
  useEffect(() => {
    if (!checking && !user && process.env.NEXT_PUBLIC_ADMIN_AUTH_MODE === "redirect") {
      try {
        const locale = document.documentElement.getAttribute("lang") || "";
        router.replace(`/${locale}/login`);
      } catch {}
    }
  }, [checking, user, router]);

  if (checking) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-600">
        A verificar sessão...
      </div>
    );
  }

  if (!user)
    return (
      <div className="min-h-[70vh] w-full flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <CardAuth />
        </div>
      </div>
    );
  return <>{children}</>;
}
