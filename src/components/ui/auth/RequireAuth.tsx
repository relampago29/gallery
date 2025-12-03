"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";

type Props = {
  children: ReactNode;
  fallbackCallbackUrl?: string;
};

export default function RequireAuth({ children, fallbackCallbackUrl }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (checking || user) return;
    const locale = typeof document !== "undefined" ? document.documentElement.getAttribute("lang") || "" : "";
    const target = process.env.NEXT_PUBLIC_ADMIN_AUTH_MODE === "redirect" ? (locale ? `/${locale}/login` : "/login") : locale ? `/${locale}/login` : "/login";
    setRedirecting(true);
    router.replace(target);
  }, [checking, user, router]);

  if (checking) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-600">
        A verificar sessão...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/70">
        {redirecting ? "A redirecionar para login..." : "Sessão em falta. A redirecionar..."}
      </div>
    );
  }
  return <>{children}</>;
}
