"use client";

import { useTranslations } from "next-intl";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { MapPin, Clock, Mail, Phone, Loader2 } from "lucide-react";

export default function StudioLocation() {
  const t = useTranslations("studioLocation");
  const { info, loading } = useSiteInfo();

  // Don't render section if there's no data at all
  const hasAddress = info.address || info.city;
  const hasMap = info.mapEmbedUrl;

  if (loading) {
    return (
      <section className="w-full bg-black py-20">
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-white/30" />
        </div>
      </section>
    );
  }

  if (!hasAddress && !hasMap && !info.phone && !info.email) {
    return null;
  }

  const addressDisplay = [info.address, info.city].filter(Boolean).join(", ");
  const locationLine2 = [info.postalCode, info.country]
    .filter(Boolean)
    .join(", ");
  const hoursLine1 = info.hoursWeekdays
    ? `Seg – Sex: ${info.hoursWeekdays}`
    : "";
  const hoursLine2 = info.hoursSaturday ? `Sáb: ${info.hoursSaturday}` : "";

  return (
    <section className="w-full bg-black py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="badge badge-primary badge-lg">{t("badge")}</div>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            {t("title")}
          </h2>
          <p className="max-w-2xl mx-auto text-base md:text-lg text-white/70">
            {t("subtitle")}
          </p>
        </div>

        {/* Content: Map + Info */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Map */}
          {hasMap && (
            <div className="lg:col-span-3 overflow-hidden rounded-3xl border border-white/10 shadow-[0_25px_120px_rgba(0,0,0,0.45)]">
              <iframe
                src={info.mapEmbedUrl}
                className="w-full h-[350px] lg:h-full min-h-[350px]"
                style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={t("mapTitle")}
              />
            </div>
          )}

          {/* Info card */}
          <div
            className={`${
              hasMap ? "lg:col-span-2" : "lg:col-span-5 max-w-lg mx-auto w-full"
            } flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm shadow-[0_25px_120px_rgba(0,0,0,0.45)]`}
          >
            {/* Address */}
            {hasAddress && (
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <MapPin size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/90">
                    {t("addressLabel")}
                  </h3>
                  <p className="mt-1 text-sm text-white/60 leading-relaxed">
                    {addressDisplay}
                    {locationLine2 && (
                      <>
                        <br />
                        {locationLine2}
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Hours */}
            {(hoursLine1 || hoursLine2) && (
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Clock size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/90">
                    {t("hoursLabel")}
                  </h3>
                  <p className="mt-1 text-sm text-white/60 leading-relaxed">
                    {hoursLine1}
                    {hoursLine1 && hoursLine2 && <br />}
                    {hoursLine2}
                  </p>
                </div>
              </div>
            )}

            {/* Email */}
            {info.email && (
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Mail size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/90">
                    {t("emailLabel")}
                  </h3>
                  <p className="mt-1 text-sm text-white/60">{info.email}</p>
                </div>
              </div>
            )}

            {/* Phone */}
            {info.phone && (
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Phone size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/90">
                    {t("phoneLabel")}
                  </h3>
                  <p className="mt-1 text-sm text-white/60">{info.phone}</p>
                </div>
              </div>
            )}

            {/* CTA */}
            {info.mapLink && (
              <a
                href={info.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary mt-auto w-full"
              >
                <MapPin size={16} /> {t("openMaps")}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
