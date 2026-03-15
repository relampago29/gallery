"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase/client";
import { AdminNotification } from "@/components/admin/Notification";
import {
  MapPin,
  Clock,
  Mail,
  Phone,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  Save,
  Loader2,
  Map,
  Check,
} from "lucide-react";

/* ─── Types ───────────────────────────────────── */

type SiteInfo = {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  mapEmbedUrl: string;
  mapLink: string;
  phone: string;
  email: string;
  hoursWeekdays: string;
  hoursSaturday: string;
  hoursSunday: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  website: string;
};

const EMPTY: SiteInfo = {
  address: "",
  city: "",
  postalCode: "",
  country: "",
  mapEmbedUrl: "",
  mapLink: "",
  phone: "",
  email: "",
  hoursWeekdays: "",
  hoursSaturday: "",
  hoursSunday: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  youtube: "",
  website: "",
};

type SectionKey = "location" | "contacts" | "hours" | "social";

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sessão para continuar");
  return user.getIdToken(true);
}

/* ─── Reusable Field ──────────────────────────── */

function Field({
  label,
  icon,
  hint,
  ...props
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-white/60 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <input
        {...props}
        className="input input-bordered w-full bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-colors"
      />
      {hint && (
        <span className="text-[10px] text-white/30 leading-tight block">
          {hint}
        </span>
      )}
    </label>
  );
}

/* ─── Section Card ────────────────────────────── */

function SectionCard({
  icon,
  title,
  description,
  saving,
  saved,
  onSave,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
      {/* Section header */}
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="text-xs text-white/40 mt-0.5">{description}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          aria-live="polite"
          className={`
            flex items-center justify-center gap-1.5 px-3 h-8 rounded-lg font-medium text-sm shadow
            transition-all duration-200 min-w-[90px] shrink-0
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70
            ${
              saved
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/20 hover:from-green-600 hover:to-emerald-700"
                : saving
                  ? "bg-gradient-to-r from-primary/60 to-primary text-white opacity-80 cursor-wait"
                  : "bg-gradient-to-r from-primary to-primary/80 text-white hover:from-primary/80 hover:to-primary/90 active:scale-[0.98]"
            }
          `}
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <Check size={14} className="" />
          ) : (
            <Save size={14} className="" />
          )}
          <span className="ml-1">
            {saving ? "A guardar…" : saved ? "Guardado" : "Guardar"}
          </span>
        </button>
      </div>

      {/* Section body */}
      <div className="px-6 py-5 space-y-4">{children}</div>
    </section>
  );
}

/* ─── Page ────────────────────────────────────── */

export default function SiteSettingsPage() {
  const [form, setForm] = useState<SiteInfo>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [savingMap, setSavingMap] = useState<Record<SectionKey, boolean>>({
    location: false,
    contacts: false,
    hours: false,
    social: false,
  });
  const [savedMap, setSavedMap] = useState<Record<SectionKey, boolean>>({
    location: false,
    contacts: false,
    hours: false,
    social: false,
  });
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/settings/site-info", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Falha ao carregar");
      const json = await res.json();
      const d = json.data ?? {};
      setForm({
        address: d.address ?? "",
        city: d.city ?? "",
        postalCode: d.postalCode ?? "",
        country: d.country ?? "",
        mapEmbedUrl: d.mapEmbedUrl ?? "",
        mapLink: d.mapLink ?? "",
        phone: d.phone ?? "",
        email: d.email ?? "",
        hoursWeekdays: d.hoursWeekdays ?? "",
        hoursSaturday: d.hoursSaturday ?? "",
        hoursSunday: d.hoursSunday ?? "",
        instagram: d.instagram ?? "",
        facebook: d.facebook ?? "",
        tiktok: d.tiktok ?? "",
        youtube: d.youtube ?? "",
        website: d.website ?? "",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar";
      setToast({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }

  const saveSection = useCallback(
    async (section: SectionKey) => {
      setSavingMap((p) => ({ ...p, [section]: true }));
      setSavedMap((p) => ({ ...p, [section]: false }));
      setToast(null);
      try {
        const token = await getIdToken();
        const res = await fetch("/api/settings/site-info", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || "Falha ao guardar");
        }
        setSavedMap((p) => ({ ...p, [section]: true }));
        setTimeout(
          () => setSavedMap((p) => ({ ...p, [section]: false })),
          3000,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro ao guardar";
        setToast({ type: "error", message });
      } finally {
        setSavingMap((p) => ({ ...p, [section]: false }));
      }
    },
    [form],
  );

  function update(field: keyof SiteInfo) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setSavedMap({
        location: false,
        contacts: false,
        hours: false,
        social: false,
      });
    };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && (
        <AdminNotification
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Informações do site</h1>
        <p className="mt-1 text-sm text-white/50">
          Configura a morada, horários, contactos e redes sociais. Estas
          informações aparecem no site público e no rodapé.
        </p>
      </div>

      {/* ── Location ──────────────────────────────── */}
      <SectionCard
        icon={<MapPin size={16} />}
        title="Morada / Localização"
        description="Endereço físico e Google Maps"
        saving={savingMap.location}
        saved={savedMap.location}
        onSave={() => saveSection("location")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Rua / Endereço"
            placeholder="Rua Exemplo, 123"
            value={form.address}
            onChange={update("address")}
          />
          <Field
            label="Cidade"
            placeholder="Lisboa"
            value={form.city}
            onChange={update("city")}
          />
          <Field
            label="Código Postal"
            placeholder="1000-001"
            value={form.postalCode}
            onChange={update("postalCode")}
          />
          <Field
            label="País"
            placeholder="Portugal"
            value={form.country}
            onChange={update("country")}
          />
        </div>

        <div className="space-y-4 pt-3 border-t border-white/6">
          <div className="flex items-center gap-2 text-white/50 text-xs font-medium">
            <Map size={13} />
            Google Maps
          </div>
          <Field
            label="URL do embed do Google Maps"
            type="url"
            placeholder="https://www.google.com/maps/embed?pb=..."
            value={form.mapEmbedUrl}
            onChange={update("mapEmbedUrl")}
            hint="Google Maps → Partilhar → Incorporar um mapa → copiar o src do iframe"
          />
          <Field
            label="Link direto do Google Maps"
            type="url"
            placeholder="https://maps.google.com/?q=..."
            value={form.mapLink}
            onChange={update("mapLink")}
            hint='Link que abre ao clicar em "Abrir no Google Maps"'
          />
        </div>
      </SectionCard>

      {/* ── Contacts ──────────────────────────────── */}
      <SectionCard
        icon={<Phone size={16} />}
        title="Contactos"
        description="Email e telefone públicos"
        saving={savingMap.contacts}
        saved={savedMap.contacts}
        onSave={() => saveSection("contacts")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Email"
            icon={<Mail size={12} />}
            type="email"
            placeholder="geral@momentos.pt"
            value={form.email}
            onChange={update("email")}
          />
          <Field
            label="Telefone"
            icon={<Phone size={12} />}
            type="tel"
            placeholder="+351 912 345 678"
            value={form.phone}
            onChange={update("phone")}
          />
        </div>
      </SectionCard>

      {/* ── Hours ─────────────────────────────────── */}
      <SectionCard
        icon={<Clock size={16} />}
        title="Horário de funcionamento"
        description="Horários visíveis na secção de contacto"
        saving={savingMap.hours}
        saved={savedMap.hours}
        onSave={() => saveSection("hours")}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field
            label="Seg – Sex"
            placeholder="10h – 19h"
            value={form.hoursWeekdays}
            onChange={update("hoursWeekdays")}
          />
          <Field
            label="Sábado"
            placeholder="10h – 14h"
            value={form.hoursSaturday}
            onChange={update("hoursSaturday")}
          />
          <Field
            label="Domingo"
            placeholder="Encerrado"
            value={form.hoursSunday}
            onChange={update("hoursSunday")}
          />
        </div>
      </SectionCard>

      {/* ── Social media ──────────────────────────── */}
      <SectionCard
        icon={<Globe size={16} />}
        title="Redes sociais"
        description="Links para as redes sociais e website"
        saving={savingMap.social}
        saved={savedMap.social}
        onSave={() => saveSection("social")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Instagram"
            icon={<Instagram size={12} />}
            type="url"
            placeholder="https://www.instagram.com/..."
            value={form.instagram}
            onChange={update("instagram")}
          />
          <Field
            label="Facebook"
            icon={<Facebook size={12} />}
            type="url"
            placeholder="https://www.facebook.com/..."
            value={form.facebook}
            onChange={update("facebook")}
          />
          <Field
            label="TikTok"
            type="url"
            placeholder="https://www.tiktok.com/@..."
            value={form.tiktok}
            onChange={update("tiktok")}
          />
          <Field
            label="YouTube"
            icon={<Youtube size={12} />}
            type="url"
            placeholder="https://www.youtube.com/..."
            value={form.youtube}
            onChange={update("youtube")}
          />
          <div className="md:col-span-2">
            <Field
              label="Website"
              icon={<Globe size={12} />}
              type="url"
              placeholder="https://www.momentos.pt"
              value={form.website}
              onChange={update("website")}
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
