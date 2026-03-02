"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop, {
  EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Plus, Trash2, GripVertical, Wrench } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { DraggableEquipment } from "@/components/admin/agenda/DraggableEquipment";
import { DroppableEventWrapper } from "@/components/admin/agenda/DroppableEventWrapper";
import {
  EventEditorModal,
  type Equipment,
  type AgendaUser,
} from "@/components/admin/agenda/EventEditorModal";
import { AdminNotification } from "@/components/admin/Notification";

/* ——— CSS imports ——— */
// @ts-expect-error css modules without type declarations
import "react-big-calendar/lib/css/react-big-calendar.css";
// @ts-expect-error css modules without type declarations
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

/* ——— Localizer ——— */
const locales = { "pt-BR": ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

/* ——— Types ——— */
type AgendaEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  equipmentIds: string[];
  assignedUsers: AgendaUser[];
  color?: string;
};

/* ——— DnD Calendar ——— */
const DnDCalendar = withDragAndDrop<AgendaEvent>(Calendar);

/* ——— Color palette ——— */
const EVENT_COLORS = [
  "#6366f1", // indigo
  "#3b82f6", // blue
  "#a855f7", // purple
  "#14b8a6", // teal
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#22c55e", // green
  "#ef4444", // red
  "#ec4899", // pink
  "#06b6d4", // cyan
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function pickColor(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

/* ——— Helpers ——— */
function toDateString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildDateFromParts(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sessão para continuar.");
  return user.getIdToken();
}

/* ========================= Inner content ========================= */

function AgendaContent() {
  /* --- State --- */
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [equipmentInput, setEquipmentInput] = useState("");
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [toast, setToast] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  /* --- All users for the picker --- */
  const [allUsers, setAllUsers] = useState<AgendaUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  /* --- Event editor modal --- */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editorInitial, setEditorInitial] = useState<{
    title: string;
    equipmentIds: string[];
    assignedUsers: AgendaUser[];
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const calendarRef = useRef<HTMLDivElement>(null);

  /* --- Fetch all users on mount --- */
  useEffect(() => {
    let cancelled = false;
    async function loadAllUsers() {
      setUsersLoading(true);
      try {
        const token = await getIdToken();
        const fetched: AgendaUser[] = [];
        let pageToken: string | null = null;

        // Paginate through all users
        do {
          const url = new URL("/api/users", window.location.origin);
          if (pageToken) url.searchParams.set("pageToken", pageToken);
          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) break;
          const data = await res.json();
          for (const u of data.users) {
            fetched.push({
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
            });
          }
          pageToken = data.nextPageToken ?? null;
        } while (pageToken);

        if (!cancelled) setAllUsers(fetched);
      } catch {
        // silent — users just won't appear in the picker
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    }
    loadAllUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  /* --- Messages PT --- */
  const messages = useMemo(
    () => ({
      today: "Hoje",
      previous: "Anterior",
      next: "Seguinte",
      month: "Mês",
      week: "Semana",
      day: "Dia",
      agenda: "Agenda",
      date: "Data",
      time: "Hora",
      event: "Evento",
      noEventsInRange: "Sem eventos neste período.",
      showMore: (total: number) => `+${total} mais`,
    }),
    [],
  );

  /* ---------- Equipment ---------- */
  const addEquipment = useCallback(() => {
    const name = equipmentInput.trim();
    if (!name) return;
    if (equipments.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
      setToast({ type: "warning", message: `"${name}" já existe.` });
      return;
    }
    setEquipments((prev) => [...prev, { id: uid(), name }]);
    setEquipmentInput("");
  }, [equipmentInput, equipments]);

  const removeEquipment = useCallback((id: string) => {
    setEquipments((prev) => prev.filter((e) => e.id !== id));
    setEvents((prev) =>
      prev.map((ev) => ({
        ...ev,
        equipmentIds: ev.equipmentIds.filter((eqId) => eqId !== id),
      })),
    );
  }, []);

  /* ---------- Drop equipment onto event ---------- */
  const handleDropEquipmentOnEvent = useCallback(
    (eventId: string, equipmentId: string) => {
      const eq = equipments.find((e) => e.id === equipmentId);
      setEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== eventId) return ev;
          if (ev.equipmentIds.includes(equipmentId)) {
            setToast({
              type: "warning",
              message: `${eq?.name || "Equipamento"} já está atribuído a "${ev.title}".`,
            });
            return ev;
          }
          setToast({
            type: "success",
            message: `${eq?.name || "Equipamento"} adicionado a "${ev.title}".`,
          });
          return { ...ev, equipmentIds: [...ev.equipmentIds, equipmentId] };
        }),
      );
    },
    [equipments],
  );

  /* ---------- Calendar interactions ---------- */
  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      setEditorMode("create");
      setEditingEventId(null);
      setEditorInitial({
        title: "",
        equipmentIds: [],
        assignedUsers: [],
        date: toDateString(start),
        startTime: toTimeString(start),
        endTime: toTimeString(end),
      });
      setEditorOpen(true);
    },
    [],
  );

  const handleSelectEvent = useCallback((event: AgendaEvent) => {
    setEditorMode("edit");
    setEditingEventId(event.id);
    setEditorInitial({
      title: event.title,
      equipmentIds: event.equipmentIds,
      assignedUsers: event.assignedUsers,
      date: toDateString(event.start),
      startTime: toTimeString(event.start),
      endTime: toTimeString(event.end),
    });
    setEditorOpen(true);
  }, []);

  const handleEditorSave = useCallback(
    (data: {
      title: string;
      equipmentIds: string[];
      assignedUsers: AgendaUser[];
      date: string;
      startTime: string;
      endTime: string;
    }) => {
      const startDate = buildDateFromParts(data.date, data.startTime);
      const endDate = buildDateFromParts(data.date, data.endTime);

      if (editorMode === "create") {
        setEvents((prev) => [
          ...prev,
          {
            id: uid(),
            title: data.title,
            start: startDate,
            end: endDate,
            equipmentIds: data.equipmentIds,
            assignedUsers: data.assignedUsers,
            color: pickColor(data.title),
          },
        ]);
        setToast({ type: "success", message: "Evento criado." });
      } else if (editingEventId) {
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === editingEventId
              ? {
                  ...ev,
                  title: data.title,
                  start: startDate,
                  end: endDate,
                  equipmentIds: data.equipmentIds,
                  assignedUsers: data.assignedUsers,
                  color: pickColor(data.title),
                }
              : ev,
          ),
        );
        setToast({ type: "success", message: "Evento atualizado." });
      }
      setEditorOpen(false);
    },
    [editorMode, editingEventId],
  );

  const handleEditorDelete = useCallback(() => {
    if (editingEventId) {
      setEvents((prev) => prev.filter((ev) => ev.id !== editingEventId));
      setToast({ type: "success", message: "Evento apagado." });
    }
    setEditorOpen(false);
  }, [editingEventId]);

  /* --- Move / Resize --- */
  const handleEventDrop = useCallback(
    (args: EventInteractionArgs<AgendaEvent>) => {
      const { event, start, end } = args;
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === event.id
            ? { ...ev, start: new Date(start), end: new Date(end) }
            : ev,
        ),
      );
    },
    [],
  );

  const handleEventResize = useCallback(
    (args: EventInteractionArgs<AgendaEvent>) => {
      const { event, start, end } = args;
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === event.id
            ? { ...ev, start: new Date(start), end: new Date(end) }
            : ev,
        ),
      );
    },
    [],
  );

  /* --- Event style --- */
  const eventStyleGetter = useCallback((event: AgendaEvent) => {
    return {
      style: {
        backgroundColor: event.color || "#6366f1",
        border: "none",
        borderRadius: "8px",
        color: "#fff",
        fontSize: "0.78rem",
        padding: "2px 6px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      },
    };
  }, []);

  /* --- Custom event component with equipment badges & drop target --- */
  const EventComponent = useCallback(
    ({ event }: { event: AgendaEvent }) => {
      const eqNames = event.equipmentIds
        .map((eqId) => equipments.find((e) => e.id === eqId)?.name)
        .filter(Boolean);

      return (
        <DroppableEventWrapper
          eventId={event.id}
          onDropEquipment={handleDropEquipmentOnEvent}
        >
          <div className="flex h-full flex-col gap-0.5 overflow-hidden">
            <span className="truncate font-medium leading-tight">
              {event.title}
            </span>
            {/* Assigned users */}
            {event.assignedUsers.length > 0 && (
              <div className="flex -space-x-1">
                {event.assignedUsers.slice(0, 3).map((u) =>
                  u.photoURL ? (
                    <img
                      key={u.uid}
                      src={u.photoURL}
                      alt=""
                      className="h-4 w-4 rounded-full border border-black/30 object-cover"
                    />
                  ) : (
                    <span
                      key={u.uid}
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-black/30 bg-white/20 text-[7px] font-bold uppercase"
                    >
                      {(u.displayName || u.email || "?")[0]}
                    </span>
                  ),
                )}
                {event.assignedUsers.length > 3 && (
                  <span className="flex h-4 items-center pl-2 text-[8px] opacity-70">
                    +{event.assignedUsers.length - 3}
                  </span>
                )}
              </div>
            )}
            {/* Equipment badges */}
            {eqNames.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {eqNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center rounded-full bg-white/20 px-1.5 py-0 text-[9px] font-medium leading-relaxed"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </DroppableEventWrapper>
      );
    },
    [equipments, handleDropEquipmentOnEvent],
  );

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <AdminNotification
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Event editor modal */}
      <EventEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleEditorSave}
        onDelete={editorMode === "edit" ? handleEditorDelete : undefined}
        equipments={equipments}
        allUsers={allUsers}
        initial={editorInitial ?? undefined}
        mode={editorMode}
      />

      {/* Header */}
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Admin
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Agenda
        </h1>
        <p className="text-sm text-white/70">
          Clica no calendário para criar eventos. Arrasta equipamento para cima
          dos eventos para os atribuir.
        </p>
      </header>

      {/* Main layout — Calendar LEFT, Sidebar RIGHT */}
      <div className="flex flex-col-reverse gap-6 lg:flex-row">
        {/* Calendar */}
        <div
          ref={calendarRef}
          className={`${cardClass} flex-1 overflow-hidden p-4`}
        >
          <div className="agenda-calendar" style={{ height: "80vh" }}>
            <DnDCalendar
              localizer={localizer}
              events={events}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              defaultView="week"
              views={["month", "week", "day", "agenda"]}
              step={30}
              timeslots={2}
              selectable
              resizable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              eventPropGetter={eventStyleGetter}
              components={{
                event: EventComponent as any,
              }}
              messages={messages}
              culture="pt-BR"
              min={new Date(1970, 0, 1, 7, 0, 0)}
              max={new Date(1970, 0, 1, 22, 0, 0)}
              style={{ height: "100%" }}
              tooltipAccessor={(ev) => {
                const eqNames = ev.equipmentIds
                  .map((eqId) => equipments.find((e) => e.id === eqId)?.name)
                  .filter(Boolean);
                const userNames = ev.assignedUsers
                  .map((u) => u.displayName || u.email)
                  .filter(Boolean);
                return `${ev.title}${userNames.length ? ` — ${userNames.join(", ")}` : ""}${eqNames.length ? ` | ${eqNames.join(", ")}` : ""}`;
              }}
            />
          </div>
        </div>

        {/* Sidebar — RIGHT */}
        <aside className="w-full shrink-0 space-y-6 lg:w-72">
          {/* --- Equipment section --- */}
          <div className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-2">
              <Wrench size={16} className="text-white/40" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Equipamento
              </h2>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addEquipment();
              }}
              className="mb-4 flex gap-2"
            >
              <input
                value={equipmentInput}
                onChange={(e) => setEquipmentInput(e.target.value)}
                placeholder="Novo equipamento…"
                className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!equipmentInput.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
                title="Adicionar equipamento"
              >
                <Plus size={16} />
              </button>
            </form>

            {equipments.length === 0 ? (
              <p className="py-3 text-center text-xs text-white/40">
                Adiciona equipamento para arrastar para os eventos.
              </p>
            ) : (
              <div className="space-y-2">
                {equipments.map((eq) => (
                  <DraggableEquipment
                    key={eq.id}
                    id={eq.id}
                    name={eq.name}
                    onRemove={() => removeEquipment(eq.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* --- Events summary --- */}
          {events.length > 0 && (
            <div className={`${cardClass} p-5`}>
              <div className="mb-3 flex items-center gap-2">
                <GripVertical size={14} className="text-white/40" />
                <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/50">
                  Eventos ({events.length})
                </h3>
              </div>
              <ul className="space-y-1">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/70 transition hover:bg-white/5"
                    onClick={() => handleSelectEvent(ev)}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: ev.color || "#6366f1",
                      }}
                    />
                    <span className="flex-1 truncate">{ev.title}</span>
                    {ev.assignedUsers.length > 0 && (
                      <span className="shrink-0 text-[9px] text-white/40">
                        {ev.assignedUsers.length}👤
                      </span>
                    )}
                    {ev.equipmentIds.length > 0 && (
                      <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/50">
                        {ev.equipmentIds.length}
                        <Wrench size={8} className="ml-0.5 inline" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEvents((prev) => prev.filter((x) => x.id !== ev.id));
                      }}
                      className="shrink-0 text-white/20 transition hover:text-red-300"
                      title="Apagar evento"
                    >
                      <Trash2 size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ========================= Page wrapper ========================= */

export default function AgendaPage() {
  return (
    <DndProvider backend={HTML5Backend}>
      <AgendaContent />
    </DndProvider>
  );
}
