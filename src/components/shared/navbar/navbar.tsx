'use client';

import React, { useEffect, useState } from 'react';
import {useTranslations, useLocale} from 'next-intl';
import {Link, usePathname} from '@/i18n/navigation'; 
import { useSearchParams} from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import logotipo from '../../../../public/brand/logo-sem-fundo-sem-nome.png';


const NavBar: React.FC = () => {
  const translate = useTranslations('navbar');
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const hrefWithQs = React.useMemo(() => {
    const qs = searchParams?.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  return ( 
    <div className="navbar bg-base-100">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow">
            <li><a>Portofólio</a></li>
            <li>
              <a>Parent</a>
              <ul className="p-2">
                <li><a href="/admi.tsx"></a></li>
                <li><a>Submenu 2</a></li>
              </ul>
            </li>
            <li><a>Item 3</a></li>
          </ul>
        </div>
        <img src={logotipo.src} alt="logo"  className='w-10 h-8'/>
        <a className="text-xl pl-2 pt-1">Momentos</a>        
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><a>{translate('portfolio')}</a></li>
          <li><a>{translate('about')}</a></li>         
          <li><a>{translate('contact')}</a></li>
          {user && (
            <li>
              <Link href="/admin">Admin</Link>
            </li>
          )}
        </ul>
      </div>

      {/* ===== Dropdown de Idiomas (END) ===== */}
      <div className="navbar-end">
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost">
            {locale.toUpperCase()}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-2 w-28 p-2 shadow">
            <li>
              <Link
                href={hrefWithQs}
                locale="pt"
                className={locale === 'pt' ? 'active' : undefined}
                aria-current={locale === 'pt' ? 'page' : undefined}
              >
                PT
              </Link>
            </li>
            <li>
              <Link
                href={hrefWithQs}
                locale="en"
                className={locale === 'en' ? 'active' : undefined}
                aria-current={locale === 'en' ? 'page' : undefined}
              >
                EN
              </Link>
            </li>
          </ul>
        </div>
      </div>
      {/* ===================================== */}
    </div>
  );
};

export default NavBar;
