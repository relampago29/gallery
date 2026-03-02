"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

export type Resource = {
  id: string;
  name: string;
  eventColor: string;
};

export type Equipment = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    resourceId: string;
    equipmentIds: string[];
    start: Date;
    end: Date;
  }) => void;
  onDelete?: () => void;
  resources: Resource[];
  equipments: Equipment[];
  initial?: {
    title: string;
    resourceId: string;
    equipmentIds: string[];
    start: Date;
    end: Date;
  };
  mode: "create" | "edit";
};

function toLocalDatetimeString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventEditorModal({
  open,
  onClose,
  onSave,
  onDelete,
  resources,
  equipments,
  initial,
  mode,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [resourceId, setResourceId] = useState(initial?.resourceId ?? "");
  const [equipmentIds, setEquipmentIds] = useState<string[]>(
    initial?.equipmentIds ?? [],
  );
  const [start, setStart] = useState(
    toLocalDatetimeString(initial?.start ?? new Date()),
  );
  const [end, setEnd] = useState(
    toLocalDatetimeString(initial?.end ?? new Date()),
  );

  useEffect(() => {
    if (open && initial) {
      setTitle(initial.title);
      setResourceId(initial.resourceId);
      setEquipmentIds(initial.equipmentIds);
      setStart(toLocalDatetimeString(initial.start));
      setEnd(toLocalDatetimeString(initial.end));
    }
  }, [open, initial]);

  if (!open) return null;

  const toggleEquipment = (eqId: string) => {
    setEquipmentIds((prev) =>
      prev.includes(eqId) ? prev.filter((id) => id !== eqId) : [...prev, eqId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !resourceId) return;
    onSave({
      title: title.trim(),
      resourceId,
      equipmentIds,
      start: new Date(start),
      end: new Date(end),
    });
  };

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none transition";
  const labelClass =
    "text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0e0e0e] p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "Novo evento" : "Editar evento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className={labelClass}>Nome do evento *</label>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Sessão fotográfica"
              required
              autoFocus
            />
          </div>

          {/* Resource (person) */}
          <div className="space-y-1.5">
            <label className={labelClass}>Recurso (pessoa) *</label>
            <select
              className={`${inputClass} cursor-pointer`}
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              required
            >
              <option value="" disabled>
                Seleciona um recurso…
              </option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Início</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Fim</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Equipment multi-select */}
          {equipments.length > 0 && (
            <div className="space-y-1.5">
              <label className={labelClass}>Equipamento</label>
              <div className="flex flex-wrap gap-2">
                {equipments.map((eq) => {
                  const selected = equipmentIds.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => toggleEquipment(eq.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        selected
                          ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-200"
                          : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                      }`}
                    >
                      {eq.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            {mode === "edit" && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-full border border-red-400/50 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
              >
                Apagar
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !resourceId}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
            >
              {mode === "create" ? "Criar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
