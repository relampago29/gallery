"use client";
import React from "react";
import { Sidebar } from "@/components/ui/auth/Sidebar";
import { Toaster } from "sonner";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#030303] text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%)]" />
        <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-[#7c3aed1f] blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#f472b61f] blur-3xl" />
      </div>

      <aside className="relative z-10 w-64 flex-shrink-0 border-r border-white/10 bg-white/5 backdrop-blur-lg">
        <Sidebar />
      </aside>

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#030303]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Admin</p>
              <div className="text-lg font-semibold text-white">Dashboard</div>
            </div>
            <Link
              href="/"
              locale={locale}
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-1.5 text-sm text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              ← Voltar ao site
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-10">{children}</div>
        </main>
      </div>

      <Toaster richColors closeButton />
    </div>
  );
}
