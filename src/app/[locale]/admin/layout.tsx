import React from "react";
import { Sidebar } from "@/components/ui/auth/Sidebar";
import RequireAuth from "@/components/ui/auth/RequireAuth";

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
      {/* Sidebar mais estreita */}
      <div className="w-60 bg-white border-r border-gray-200 flex-shrink-0">
        <Sidebar />
      </div>

      {/* ÃƒÂrea principal expandida */}
      <main className="flex-1 bg-gray-50 p-10  overflow-y-auto">
        <div className="w-full">
          <RequireAuth>{children}</RequireAuth>
        </div>
      </main>
    </div>
  );
}
