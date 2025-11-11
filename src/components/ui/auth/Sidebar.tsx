"use client";
import Link from "next/link";
import {useLocale} from "next-intl";

export function Sidebar() {
  const locale = useLocale();
  const base = `/${locale}/admin`;

  return (
    <aside className="p-4 space-y-3">
      <div className="text-xs font-semibold uppercase text-gray-500">Portfólio público</div>
      <ul className="menu menu-sm">
        <li><Link href={`${base}/public/upload`}>Upload</Link></li>
        <li><Link href={`${base}/public/list`}>Lista</Link></li>
        <li><Link href={`${base}/categories`}>Categorias</Link></li>{/* 👈 novo */}
      </ul>
    </aside>
  );
}
