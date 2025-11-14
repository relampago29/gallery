"use server";

import NavBar from "@/components/shared/navbar/navbar";
import { PublicGallery } from "@/components/portfolio/PublicGallery";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = {
  params: { locale: string };
};

export default async function PortfolioPage({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: "portofolioPage" });

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />

      <main className="mx-auto max-w-6xl space-y-12 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Portfolio</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-white/70">{t("subtitle")}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              {t("cta")}
            </Link>
          </div>
        </header>

        <PublicGallery />
      </main>
    </div>
  );
}
