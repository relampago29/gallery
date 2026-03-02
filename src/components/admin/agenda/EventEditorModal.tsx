"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Search, UserPlus, Check, Wrench, ChevronDown } from "lucide-react";

/* ——— Public types ——— */

export type Equipment = {
  id: string;
  name: string;
};

export type AgendaUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

type SaveData = {
  title: string;
  description: string;
  equipmentIds: string[];
  assignedUsers: AgendaUser[];
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: SaveData) => void;
  onDelete?: () => void;
  equipments: Equipment[];
  /** All users in the system (fetched by the parent page) */
  allUsers: AgendaUser[];
  initial?: {
    title: string;
    description: string;
    equipmentIds: string[];
    assignedUsers: AgendaUser[];
    date: string;
    startTime: string;
    endTime: string;
  };
  mode: "create" | "edit";
};

/* ——— Helpers ——— */

function toDateString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Auto-format a raw digit string into HH:MM.
 * User types "1135" → display "11:35".
 * Strips non-digits, inserts ":" after 2 digits, caps at 5 chars.
 */
function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isValidTime(v: string) {
  return /^\d{2}:\d{2}$/.test(v);
}

/* ==================== User Picker Overlay ==================== */

function UserPickerOverlay({
  allUsers,
  selected,
  onToggle,
  onClose,
}: {
  allUsers: AgendaUser[];
  selected: AgendaUser[];
  onToggle: (u: AgendaUser) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const filtered = allUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.displayName?.toLowerCase().includes(q) ?? false) ||
      (u.email?.toLowerCase().includes(q) ?? false)
    );
  });

  const selectedIds = new Set(selected.map((u) => u.uid));

  return (
    <div
      ref={ref}
      className="absolute inset-x-0 bottom-full z-50 mb-2 max-h-72 overflow-hidden rounded-2xl border border-white/15 bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
    >
      {/* Search */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <Search size={14} className="shrink-0 text-white/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar utilizadores…"
          autoFocus
          className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
        />
      </div>

      {/* List */}
      <div className="max-h-56 overflow-y-auto p-1.5">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-white/40">
            Nenhum utilizador encontrado.
          </p>
        ) : (
          filtered.map((u) => {
            const isSelected = selectedIds.has(u.uid);
            return (
              <button
                key={u.uid}
                type="button"
                onClick={() => onToggle(u)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                  isSelected
                    ? "bg-indigo-500/15 text-white"
                    : "text-white/70 hover:bg-white/5"
                }`}
              >
                {/* Avatar */}
                {u.photoURL ? (
                  <img
                    src={u.photoURL}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold uppercase text-white/60">
                    {(u.displayName || u.email || "?")[0]}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">
                    {u.displayName || "Sem nome"}
                  </p>
                  {u.email && (
                    <p className="truncate text-[11px] text-white/40">
                      {u.email}
                    </p>
                  )}
                </div>

                {isSelected && (
                  <Check size={14} className="shrink-0 text-indigo-400" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ==================== Main Modal ==================== */

export function EventEditorModal({
  open,
  onClose,
  onSave,
  onDelete,
  equipments,
  allUsers,
  initial,
  mode,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dateVal, setDateVal] = useState(
    initial?.date ?? toDateString(new Date()),
  );
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "10:00");
  const [equipmentIds, setEquipmentIds] = useState<string[]>(
    initial?.equipmentIds ?? [],
  );
  const [assignedUsers, setAssignedUsers] = useState<AgendaUser[]>(
    initial?.assignedUsers ?? [],
  );
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);

  useEffect(() => {
    if (open && initial) {
      setTitle(initial.title);
      setDescription(initial.description);
      setDateVal(initial.date);
      setStartTime(initial.startTime);
      setEndTime(initial.endTime);
      setEquipmentIds(initial.equipmentIds);
      setAssignedUsers(initial.assignedUsers);
      setUserPickerOpen(false);
      setEquipmentOpen(false);
    }
  }, [open, initial]);

  const toggleUser = useCallback((u: AgendaUser) => {
    setAssignedUsers((prev) =>
      prev.some((x) => x.uid === u.uid)
        ? prev.filter((x) => x.uid !== u.uid)
        : [...prev, u],
    );
  }, []);

  const toggleEquipment = useCallback((eqId: string) => {
    setEquipmentIds((prev) =>
      prev.includes(eqId) ? prev.filter((id) => id !== eqId) : [...prev, eqId],
    );
  }, []);

  if (!open) return null;

  const canSave =
    title.trim() !== "" && isValidTime(startTime) && isValidTime(endTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      equipmentIds,
      assignedUsers,
      date: dateVal,
      startTime,
      endTime,
    });
  };

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none transition";
  const labelClass =
    "text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 mb-1.5 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0e0e0e] p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
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

          {/* Description */}
          <div>
            <label className={labelClass}>Descrição</label>
            <textarea
              className={`${inputClass} resize-none`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do evento…"
              rows={3}
            />
          </div>

          {/* Date */}
          <div>
            <label className={labelClass}>Data</label>
            <input
              type="date"
              className={inputClass}
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
              required
            />
          </div>

          {/* Start / End time — auto-formatted */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Hora início</label>
              <input
                className={inputClass}
                value={startTime}
                onChange={(e) => setStartTime(formatTimeInput(e.target.value))}
                placeholder="09:00"
                maxLength={5}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelClass}>Hora fim</label>
              <input
                className={inputClass}
                value={endTime}
                onChange={(e) => setEndTime(formatTimeInput(e.target.value))}
                placeholder="10:00"
                maxLength={5}
                inputMode="numeric"
              />
            </div>
          </div>

          {/* ——— Assigned users ——— */}
          <div className="relative">
            <label className={labelClass}>Utilizadores</label>
            <button
              type="button"
              onClick={() => {
                setUserPickerOpen((v) => !v);
                setEquipmentOpen(false);
              }}
              className={`${inputClass} flex cursor-pointer items-center gap-2 text-left`}
            >
              <UserPlus size={14} className="shrink-0 text-white/40" />
              <span className="flex-1 truncate">
                {assignedUsers.length === 0
                  ? "Associar utilizadores…"
                  : `${assignedUsers.length} utilizador${assignedUsers.length > 1 ? "es" : ""}`}
              </span>
              <ChevronDown
                size={14}
                className={`shrink-0 text-white/40 transition ${userPickerOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Selected chips */}
            {assignedUsers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {assignedUsers.map((u) => (
                  <span
                    key={u.uid}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-1.5 pr-2 text-xs text-white/80"
                  >
                    {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt=""
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[8px] font-bold uppercase">
                        {(u.displayName || u.email || "?")[0]}
                      </span>
                    )}
                    <span className="truncate">
                      {u.displayName || u.email || "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleUser(u)}
                      className="ml-0.5 text-white/30 transition hover:text-red-300"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Overlay */}
            {userPickerOpen && (
              <UserPickerOverlay
                allUsers={allUsers}
                selected={assignedUsers}
                onToggle={toggleUser}
                onClose={() => setUserPickerOpen(false)}
              />
            )}
          </div>

          {/* ——— Equipment ——— */}
          <div>
            <label className={labelClass}>Equipamento</label>

            {/* Trigger */}
            <button
              type="button"
              onClick={() => {
                setEquipmentOpen((v) => !v);
                setUserPickerOpen(false);
              }}
              className={`${inputClass} flex cursor-pointer items-center gap-2 text-left`}
            >
              <Wrench size={14} className="shrink-0 text-white/40" />
              <span className="flex-1 truncate">
                {equipmentIds.length === 0
                  ? "Selecionar equipamento…"
                  : `${equipmentIds.length} selecionado${equipmentIds.length > 1 ? "s" : ""}`}
              </span>
              <ChevronDown
                size={14}
                className={`shrink-0 text-white/40 transition ${equipmentOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown panel */}
            {equipmentOpen && equipments.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-[#141414] p-1.5">
                {equipments.map((eq) => {
                  const selected = equipmentIds.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => toggleEquipment(eq.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                        selected
                          ? "bg-indigo-500/15 text-indigo-200"
                          : "text-white/70 hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                          selected
                            ? "border-indigo-400 bg-indigo-500/30"
                            : "border-white/20 bg-white/5"
                        }`}
                      >
                        {selected && <Check size={12} />}
                      </span>
                      <span className="flex-1 truncate">{eq.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected tags */}
            {equipmentIds.length > 0 && !equipmentOpen && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {equipmentIds.map((eqId) => {
                  const eq = equipments.find((e) => e.id === eqId);
                  if (!eq) return null;
                  return (
                    <span
                      key={eq.id}
                      className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200"
                    >
                      <Wrench size={10} className="shrink-0" />
                      {eq.name}
                      <button
                        type="button"
                        onClick={() => toggleEquipment(eq.id)}
                        className="ml-0.5 text-indigo-300/60 transition hover:text-red-300"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

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
              disabled={!canSave}
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
