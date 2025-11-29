"use client";

import { useEffect, useMemo, useState } from "react";

type WeekPoint = { week: number; uploads: number; orders: number; paid: number };
type MonthPoint = { month: number; uploads: number; orders: number; paid: number };

type Props = {
  weeks?: WeekPoint[];
  months?: MonthPoint[];
};

function formatWeek(ts: number) {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}`;
}

function formatMonth(ts: number) {
  const d = new Date(ts);
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

function LineChart({
  data,
  label,
  color,
  secondary,
  legend,
}: {
  data: { label: string; value: number }[];
  label: string;
  color: string;
  secondary?: { label: string; value: number; color: string };
  legend?: { label: string; color: string }[];
}) {
  const maxPrimary = Math.max(...data.map((p) => p.value), 1);
  const maxSecondary = secondary ? Math.max(...data.map((p) => secondary.value), 1) : 0;
  const max = Math.max(maxPrimary, maxSecondary || 0, 1);

  const buildPoints = (series: { label: string; value: number }[]) =>
    series.map((p, idx) => {
      const x = (idx / Math.max(series.length - 1, 1)) * 100;
      const y = 100 - (p.value / max) * 100;
      return `${x},${y}`;
    });

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_45%),rgba(255,255,255,0.03)] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-white">{label}</div>
        <div className="text-xs text-white/60">Máx: {max}</div>
      </div>
      <svg viewBox="0 0 100 100" className="h-48 w-full text-white/20">
        <polyline fill="none" stroke="#ffffff1a" strokeWidth="0.5" points="0,100 100,100" />
        <polyline fill="none" stroke="#ffffff1a" strokeWidth="0.5" points="0,75 100,75" />
        <polyline fill="none" stroke="#ffffff1a" strokeWidth="0.5" points="0,50 100,50" />
        <polyline fill="none" stroke="#ffffff1a" strokeWidth="0.5" points="0,25 100,25" />

        {secondary ? (
          <polyline
            fill="none"
            stroke={secondary.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={buildPoints(
              data.map((p) => ({ ...p, value: secondary.value }))
            ).join(" ")}
            opacity={0.7}
          />
        ) : null}

        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={buildPoints(data).join(" ")}
        />

        {data.map((p, idx) => {
          const x = (idx / Math.max(data.length - 1, 1)) * 100;
          const y = 100 - (p.value / max) * 100;
          return <circle key={p.label} cx={x} cy={y} r={1.5} fill={color} />;
        })}
      </svg>
      <div className="grid grid-cols-4 gap-2 text-[11px] text-white/65">
        {data.map((p, idx) => (
          <div key={`${p.label}-${idx}`} className="truncate">
            {p.label}
          </div>
        ))}
      </div>
      {legend && legend.length ? (
        <div className="flex flex-wrap gap-3 text-xs text-white/70">
          {legend.map((l, idx) => (
            <span key={`${l.label}-${idx}`} className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminMetricsCharts({ weeks: initialWeeks }: Props) {
  const [weeks, setWeeks] = useState<WeekPoint[]>(initialWeeks || []);
  const [months, setMonths] = useState<MonthPoint[]>([]);
  const [mode, setMode] = useState<"weekly" | "monthly">("weekly");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialWeeks && initialWeeks.length) return;
    const load = async () => {
      try {
        const res = await fetch("/api/metrics/dashboard", { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Falha ao carregar métricas.");
        }
        const data = await res.json();
        if (Array.isArray(data?.weeks)) setWeeks(data.weeks as WeekPoint[]);
        if (Array.isArray(data?.months)) setMonths(data.months as MonthPoint[]);
      } catch (err: any) {
        setError(err?.message || "Não foi possível obter métricas.");
      }
    };
    load();
  }, [initialWeeks]);

  const uploadsSeries = useMemo(() => {
    if (mode === "monthly" && months.length) {
      return months.map((m) => ({ label: formatMonth(m.month), value: m.uploads }));
    }
    return weeks.map((w) => ({ label: formatWeek(w.week), value: w.uploads }));
  }, [weeks, months, mode]);

  const ordersSeries = useMemo(() => {
    if (mode === "monthly" && months.length) {
      return months.map((m) => ({ label: formatMonth(m.month), value: m.orders }));
    }
    return weeks.map((w) => ({ label: formatWeek(w.week), value: w.orders }));
  }, [weeks, months, mode]);

  const paidSeries = useMemo(() => {
    if (mode === "monthly" && months.length) {
      return months.map((m) => ({ label: formatMonth(m.month), value: m.paid }));
    }
    return weeks.map((w) => ({ label: formatWeek(w.week), value: w.paid }));
  }, [weeks, months, mode]);

  if (error) {
    return <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-white/70">
        <span className="text-xs uppercase tracking-[0.25em] text-white/50">Intervalo</span>
        <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("weekly")}
            className={`px-3 py-1 rounded-full ${mode === "weekly" ? "bg-white text-gray-900" : "text-white/70 hover:bg-white/10"}`}
          >
            S
          </button>
          <button
            type="button"
            onClick={() => setMode("monthly")}
            className={`px-3 py-1 rounded-full ${mode === "monthly" ? "bg-white text-gray-900" : "text-white/70 hover:bg-white/10"}`}
          >
            M
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
      <LineChart data={uploadsSeries} label="Uploads públicos por semana" color="#38bdf8" />
      <LineChart
        data={ordersSeries}
        label="Pedidos por semana"
        color="#a78bfa"
        legend={[
          { label: "Criados", color: "#a78bfa" },
          { label: "Pagos", color: "#22c55e" },
        ]}
      />
      </div>
    </div>
  );
}
