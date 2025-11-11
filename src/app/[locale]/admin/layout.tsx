"use client";
import React, { useEffect } from "react";
import { Sidebar } from "@/components/ui/auth/Sidebar";
import RequireAuth from "@/components/ui/auth/RequireAuth";
import { Toaster } from "sonner";
import { ensureFirebaseUser } from "@/lib/firebase/ensureAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => { ensureFirebaseUser().catch(console.error); }, []);
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
      <div className="w-60 bg-white border-r border-gray-200 flex-shrink-0"><Sidebar /></div>
      <main className="flex-1 bg-gray-50 p-10 overflow-y-auto"><RequireAuth>{children}</RequireAuth></main>
      <Toaster richColors closeButton />
    </div>
  );
}
