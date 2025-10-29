"use client";

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
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Galeria", href: "/admin/gallery", icon: ImageIcon },
  { name: "Vídeos", href: "/admin/videos", icon: VideoIcon },
  { name: "Documentos", href: "/admin/docs", icon: FileTextIcon },
  { name: "Definições", href: "/admin/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between">
      {/* Top Section */}
      <div className="p-6">
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
      <div className="p-6 border-t border-gray-100">
        <button
          className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-red-600 text-sm transition"
          onClick={() => alert('Implementar logout futuramente')}
        >
          <LogOut size={16} />
          Terminar Sessão
        </button>
      </div>
    </aside>
  );
}
export { Sidebar } from "./card";
