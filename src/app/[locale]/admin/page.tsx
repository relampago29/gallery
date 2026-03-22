import { Link } from "@/i18n/navigation";
import PaymentPhoneCard from "@/components/admin/PaymentPhoneCard";
import ContactEmailCard from "@/components/admin/ContactEmailCard";
import { getLocale } from "next-intl/server";
import { getAdminDb } from "@/lib/firebase/admin";

async function getPaymentPhone(): Promise<string | null> {
  try {
    const db = getAdminDb();
    const snap = await db.doc("settings/payment").get();
    const phone = snap.exists ? (snap.data()?.phone ?? null) : null;
    return typeof phone === "string" ? phone : null;
  } catch {
    return null;
  }
}

async function getContactEmail(): Promise<string | null> {
  try {
    const db = getAdminDb();
    const snap = await db.doc("settings/contact").get();
    const email = snap.exists ? (snap.data()?.email ?? null) : null;
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

export default async function AdminIndex() {
  const [locale, phone, contactEmail] = await Promise.all([
    getLocale(),
    getPaymentPhone(),
    getContactEmail(),
  ]);
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          Visão geral
        </p>
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Olá! 👋</h1>
            <p className="text-sm text-white/70">
              Acede rapidamente às últimas fotos públicas e gere as sessões
              privadas com o novo visual.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/public/upload"
              locale={locale}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Novo upload
            </Link>
            <Link
              href="/admin/public/list"
              locale={locale}
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              Ver lista completa
            </Link>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch">
        <PaymentPhoneCard initialPhone={phone} />
        <ContactEmailCard initialEmail={contactEmail} />
      </div>
    </div>
  );
}
