"use client";

import { useEffect, useState } from "react";

export type SiteInfo = {
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

let cached: SiteInfo | null = null;
let fetching: Promise<SiteInfo> | null = null;

function doFetch(): Promise<SiteInfo> {
  if (fetching) return fetching;
  fetching = fetch("/api/settings/site-info/public", { cache: "no-store" })
    .then((r) => r.json())
    .then((json) => {
      const d = json.data ?? {};
      const info: SiteInfo = {
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
      };
      cached = info;
      fetching = null;
      return info;
    })
    .catch(() => {
      fetching = null;
      return EMPTY;
    });
  return fetching;
}

/**
 * Hook to get site info from Firestore (public endpoint, cached in memory).
 */
export function useSiteInfo() {
  const [info, setInfo] = useState<SiteInfo>(cached ?? EMPTY);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) {
      setInfo(cached);
      setLoading(false);
      return;
    }
    doFetch().then((data) => {
      setInfo(data);
      setLoading(false);
    });
  }, []);

  return { info, loading };
}
