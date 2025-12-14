"use client";
import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { Images, UploadCloud, Tags, CreditCard, Users, Shuffle, ChevronDown } from "lucide-react";

type NavLink = { label: string; href: string; icon: React.ReactNode };
type NavSection = { label: string; items: NavLink[] };

function NavItem({ href, active, icon, children }: { href: string; active?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 transition ${
          active ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10"
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

  const sections: NavSection[] = [
    {
      label: "Geral",
      items: [{ label: "Início", href: `${base}`, icon: <Images size={16} /> }],
    },
    {
      label: "Envio de sessões",
      items: [
        { label: "Portfólio público", href: `${base}/public/upload`, icon: <UploadCloud size={16} /> },
        { label: "Sessões privadas", href: `${base}/sessions/upload`, icon: <UploadCloud size={16} /> },
      ],
    },
    {
      label: "Gestão pública",
      items: [
        { label: "Lista", href: `${base}/public/list`, icon: <Images size={16} /> },
        { label: "Trilho de imagens", href: `${base}/trail`, icon: <Shuffle size={16} /> },
        { label: "Destaques", href: `${base}/highlights`, icon: <Images size={16} /> },
      ],
    },
    {
      label: "Sessões privadas",
      items: [{ label: "Sessões privadas", href: `${base}/sessions`, icon: <Users size={16} /> }],
    },
    {
      label: "Configuração",
      items: [
        { label: "Categorias", href: `${base}/categories`, icon: <Tags size={16} /> },
        { label: "Pagamentos", href: `${base}/payments`, icon: <CreditCard size={16} /> },
        { label: "Utilizadores", href: `${base}/users`, icon: <Users size={16} /> },
      ],
    },
  ];
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sections.forEach((section) => {
      initial[section.label] = true;
    });
    return initial;
  });

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="h-full flex flex-col">
      <div className="h-16 px-6 border-b border-white/10 text-white flex flex-col justify-center">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60 leading-none">ADMIN</p>
        <p className="text-lg font-semibold leading-tight text-white">Painel</p>
      </div>
      <nav className="p-3">
        <div className="space-y-4 text-white">
          {sections.map((section) => (
            <div key={section.label}>
              <button
                type="button"
                onClick={() => toggleSection(section.label)}
                className="group flex w-full items-center gap-2 px-2 pb-2 text-left text-[11px] uppercase tracking-[0.25em] text-white/50 hover:text-white cursor-pointer"
                aria-expanded={openSections[section.label] ?? true}
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform ${openSections[section.label] === false ? "-rotate-90" : "rotate-0"}`}
                />
                {section.label}
              </button>
              {openSections[section.label] !== false && (
                <ul className="space-y-1">
                  {section.items.map((it) => (
                    <NavItem key={it.href} href={it.href} icon={it.icon} active={pathname?.startsWith(it.href)}>
                      {it.label}
                    </NavItem>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </nav>
      <div className="mt-auto p-3 space-y-3">
        <Link
          href={`/${locale}`}
          className="inline-flex w-full items-center justify-center rounded-full border border-white/30 px-4 py-2 text-sm text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        >
          ← Voltar ao site
        </Link>
        <div className="text-xs text-white/60">© {new Date().getFullYear()}</div>
      </div>
    </aside>
  );
}
