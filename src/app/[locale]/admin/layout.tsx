"use client";
import React, { useEffect } from "react";
import { Sidebar } from "@/components/ui/auth/Sidebar";
import RequireAuth from "@/components/ui/auth/RequireAuth";
import { Toaster } from "sonner";
import { ensureFirebaseUser } from "@/lib/firebase/ensureAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => { ensureFirebaseUser().catch(console.error); }, []);
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
          <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
            <div className="font-medium">Dashboard</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <RequireAuth>{children}</RequireAuth>
          </div>
        </main>
      </div>
      <Toaster richColors closeButton />
    </div>
  );
}
