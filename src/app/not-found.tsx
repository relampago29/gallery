import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import logotipo from "../../public/brand/logo-sem-fundo-sem-nome.png";

const translations = {
  pt: {
    title: "Página não encontrada",
    description:
      "A página que procuras não existe ou foi movida. Verifica o endereço e tenta novamente.",
    backToHome: "Voltar ao início",
  },
  en: {
    title: "Page not found",
    description:
      "The page you're looking for doesn't exist or has been moved. Check the address and try again.",
    backToHome: "Back to home",
  },
} as const;

type Locale = keyof typeof translations;

function detectLocale(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): Locale {
  const nextLocale = cookieStore.get("NEXT_LOCALE")?.value;
  if (nextLocale === "en") return "en";
  return "pt";
}

export default async function NotFound() {
  const cookieStore = await cookies();
  const locale = detectLocale(cookieStore);
  const t = translations[locale];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#030303] text-gray-100">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-[#7c3aed0d] blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#f472b60d] blur-3xl" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 text-center">
        {/* 404 large background number */}
        <p className="select-none text-[10rem] font-black leading-none tracking-tighter text-white/[0.04] sm:text-[14rem]">
          404
        </p>

        {/* Icon + message */}
        <div className="-mt-16 flex flex-col items-center gap-4 sm:-mt-20">
          <Image
            src={logotipo}
            alt="Momentos"
            width={72}
            height={72}
            className="opacity-80"
          />

          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t.title}
          </h1>

          <p className="max-w-md text-sm leading-relaxed text-white/50">
            {t.description}
          </p>

          <Link
            href={`/${locale}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} />
            {t.backToHome}
          </Link>
        </div>
      </main>
    </div>
  );
}
