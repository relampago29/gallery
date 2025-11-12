"use client";
import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { Images, UploadCloud, Tags } from "lucide-react";

function NavItem({ href, active, icon, children }: { href: string; active?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
          active ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {icon}
        <span className="truncate">{children}</span>
      </Link>
    </li>
  );
}

export function Sidebar() {
  const locale = useLocale();
  const base = `/${locale}/admin`;
  const pathname = usePathname();

  const items = [
    { label: "Upload", href: `${base}/public/upload`, icon: <UploadCloud size={16} /> },
    { label: "Lista", href: `${base}/public/list`, icon: <Images size={16} /> },
    { label: "Categorias", href: `${base}/categories`, icon: <Tags size={16} /> },
  ];

  return (
    <aside className="h-full flex flex-col">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold tracking-tight">Admin</div>
        <div className="text-xs text-gray-500">Portfólio público</div>
      </div>
      <nav className="p-3">
        <ul className="space-y-1">
          {items.map((it) => (
            <NavItem key={it.href} href={it.href} icon={it.icon} active={pathname?.startsWith(it.href)}>
              {it.label}
            </NavItem>
          ))}
        </ul>
      </nav>
      <div className="mt-auto p-3 text-xs text-gray-400">© {new Date().getFullYear()}</div>
    </aside>
  );
}
