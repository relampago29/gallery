"use client";
import React from "react";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ImageIcon,
  VideoIcon,
  FileTextIcon,
  Settings,
  LogOut,
} from "lucide-react";
import { motion } from "framer-motion";

const menuItems = [
  { name: "Painel", href: "/pt/admin", icon: LayoutDashboard },
  { name: "Galeria", href: "/pt/admin/gallery", icon: ImageIcon },
  { name: "Vídeos", href: "/pt/admin/videos", icon: VideoIcon },
  { name: "Documentos", href: "/pt/admin/docs", icon: FileTextIcon },
  { name: "Definições", href: "/pt/admin/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  return (
    <aside className="w-100 bg-white border-r border-gray-200 flex flex-col justify-between">
      {/* Top Section */}
      <div className="p-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-semibold text-gray-800 mb-8"
        >
          Painel Admin
        </motion.h1>

        <nav className="space-y-1">
          {menuItems.map(({ name, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={name}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={18} />
                {name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      {user && (
        <div className="p-6 border-t border-gray-100">
          <button
            className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-red-600 text-sm transition"
            onClick={async () => {
              try {
                // clear server session cookie
                try { await fetch("/api/auth/session", { method: "DELETE" }); } catch {}
                await auth.signOut();
                router.push("/");
              } catch (e) {
                console.error(e);
                alert("Erro ao terminar sessao");
              }
            }}
          >
            <LogOut size={16} />
            Terminar sessão
          </button>
        </div>
      )}
    </aside>
  );
}
