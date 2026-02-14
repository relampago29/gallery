"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

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

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sessão para continuar");
  return user.getIdToken();
}

export default function SiteSettingsPage() {
  const [form, setForm] = useState<SiteInfo>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Erro ao carregar" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
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
      setToast({
        type: "success",
        message: "Informações guardadas com sucesso!",
      });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Erro ao guardar" });
    } finally {
      setSaving(false);
    }
  }

  function update(field: keyof SiteInfo) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <form onSubmit={handleSave} className="space-y-8">
        {/* ── Address ────────────────────────────────── */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-2 text-white/90 font-semibold">
            <MapPin size={18} className="text-primary" />
            Morada / Localização
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60">
                Rua / Endereço
              </span>
              <input
                type="text"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="Rua Exemplo, 123"
                value={form.address}
                onChange={update("address")}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60">Cidade</span>
              <input
                type="text"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="Lisboa"
                value={form.city}
                onChange={update("city")}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60">
                Código Postal
              </span>
              <input
                type="text"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="1000-001"
                value={form.postalCode}
                onChange={update("postalCode")}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60">País</span>
              <input
                type="text"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="Portugal"
                value={form.country}
                onChange={update("country")}
              />
            </label>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Map size={14} />
              Google Maps
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60">
                URL do embed do Google Maps
              </span>
              <input
                type="url"
                className="input input-bordered w-full bg-white/5 text-white text-xs placeholder:text-white/30"
                placeholder="https://www.google.com/maps/embed?pb=..."
                value={form.mapEmbedUrl}
                onChange={update("mapEmbedUrl")}
              />
              <span className="text-[10px] text-white/30">
                Google Maps → Partilhar → Incorporar um mapa → copiar o src do
                iframe
              </span>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60">
                Link direto do Google Maps
              </span>
              <input
                type="url"
                className="input input-bordered w-full bg-white/5 text-white text-xs placeholder:text-white/30"
                placeholder="https://maps.google.com/?q=..."
                value={form.mapLink}
                onChange={update("mapLink")}
              />
              <span className="text-[10px] text-white/30">
                Link que abre ao clicar em &quot;Abrir no Google Maps&quot;
              </span>
            </label>
          </div>
        </section>

        {/* ── Contact ────────────────────────────────── */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-2 text-white/90 font-semibold">
            <Phone size={18} className="text-primary" />
            Contactos
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60">Email</span>
              <input
                type="email"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="geral@momentos.pt"
                value={form.email}
                onChange={update("email")}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60">
                Telefone
              </span>
              <input
                type="tel"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="+351 912 345 678"
                value={form.phone}
                onChange={update("phone")}
              />
            </label>
          </div>
        </section>

        {/* ── Hours ──────────────────────────────────── */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-2 text-white/90 font-semibold">
            <Clock size={18} className="text-primary" />
            Horário de funcionamento
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60">
                Seg – Sex
              </span>
              <input
                type="text"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="10h – 19h"
                value={form.hoursWeekdays}
                onChange={update("hoursWeekdays")}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60">Sábado</span>
              <input
                type="text"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="10h – 14h"
                value={form.hoursSaturday}
                onChange={update("hoursSaturday")}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60">Domingo</span>
              <input
                type="text"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="Encerrado"
                value={form.hoursSunday}
                onChange={update("hoursSunday")}
              />
            </label>
          </div>
        </section>

        {/* ── Social media ───────────────────────────── */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-2 text-white/90 font-semibold">
            <Globe size={18} className="text-primary" />
            Redes sociais
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60 flex items-center gap-1">
                <Instagram size={12} /> Instagram
              </span>
              <input
                type="url"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="https://www.instagram.com/..."
                value={form.instagram}
                onChange={update("instagram")}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60 flex items-center gap-1">
                <Facebook size={12} /> Facebook
              </span>
              <input
                type="url"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="https://www.facebook.com/..."
                value={form.facebook}
                onChange={update("facebook")}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60 flex items-center gap-1">
                TikTok
              </span>
              <input
                type="url"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="https://www.tiktok.com/@..."
                value={form.tiktok}
                onChange={update("tiktok")}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/60 flex items-center gap-1">
                <Youtube size={12} /> YouTube
              </span>
              <input
                type="url"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="https://www.youtube.com/..."
                value={form.youtube}
                onChange={update("youtube")}
              />
            </label>

            <label className="block space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-white/60 flex items-center gap-1">
                <Globe size={12} /> Website
              </span>
              <input
                type="url"
                className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                placeholder="https://www.momentos.pt"
                value={form.website}
                onChange={update("website")}
              />
            </label>
          </div>
        </section>

        {/* ── Save button ────────────────────────────── */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary gap-2"
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "A guardar…" : "Guardar informações"}
          </button>
        </div>
      </form>
    </div>
  );
}
