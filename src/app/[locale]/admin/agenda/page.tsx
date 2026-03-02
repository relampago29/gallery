"use client";

import React, { useCallback, useMemo, useState, useRef } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop, {
  EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Plus, CalendarDays, Trash2, GripVertical } from "lucide-react";
import {
  DraggableEquipment,
  EQUIPMENT_DND_TYPE,
  type EquipmentDragItem,
} from "@/components/admin/agenda/DraggableEquipment";

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
  equipment?: string;
  color?: string;
};

/* ——— DnD Calendar ——— */
const DnDCalendar = withDragAndDrop<AgendaEvent>(Calendar);

/* ——— Color palette for events ——— */
const EVENT_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#06b6d4", // cyan
];

function pickColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ========================= Inner content (requires DndProvider ancestor) ========================= */

function AgendaContent() {
  /* --- State --- */
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [equipments, setEquipments] = useState<string[]>([]);
  const [eqInput, setEqInput] = useState("");
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  /* --- Messages in PT --- */
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

  /* --- Add equipment --- */
  const addEquipment = useCallback(() => {
    const name = eqInput.trim();
    if (!name) return;
    if (equipments.some((e) => e.toLowerCase() === name.toLowerCase())) return;
    setEquipments((prev) => [...prev, name]);
    setEqInput("");
  }, [eqInput, equipments]);

  const removeEquipment = useCallback((name: string) => {
    setEquipments((prev) => prev.filter((e) => e !== name));
  }, []);

  /* --- Drop from outside --- */
  const handleDropFromOutside = useCallback(
    ({ start, end }: { start: string | Date; end: string | Date }) => {
      // The dragged equipment name is stored in draggedEquipmentRef
      const name = draggedEquipmentRef.current;
      if (!name) return;

      const s = new Date(start);
      const e = new Date(end);
      if (e.getTime() - s.getTime() < 30 * 60 * 1000) {
        e.setTime(s.getTime() + 60 * 60 * 1000); // default 1h
      }

      setEvents((prev) => [
        ...prev,
        {
          id: uid(),
          title: name,
          start: s,
          end: e,
          equipment: name,
          color: pickColor(name),
        },
      ]);
      draggedEquipmentRef.current = null;
    },
    [],
  );

  /* We use a ref to pass the dragged equipment name to the drop handler */
  const draggedEquipmentRef = useRef<string | null>(null);

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

  /* --- Select slot (click to create) --- */
  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      const title = prompt("Nome do evento:");
      if (!title) return;
      setEvents((prev) => [
        ...prev,
        {
          id: uid(),
          title,
          start,
          end,
          color: pickColor(title),
        },
      ]);
    },
    [],
  );

  /* --- Delete event --- */
  const handleSelectEvent = useCallback((event: AgendaEvent) => {
    if (confirm(`Apagar "${event.title}"?`)) {
      setEvents((prev) => prev.filter((ev) => ev.id !== event.id));
    }
  }, []);

  /* --- Event style --- */
  const eventStyleGetter = useCallback((event: AgendaEvent) => {
    return {
      style: {
        backgroundColor: event.color || "#6366f1",
        border: "none",
        borderRadius: "8px",
        color: "#fff",
        fontSize: "0.8rem",
        padding: "2px 6px",
      },
    };
  }, []);

  /* --- Drag from outside: track which equipment is being dragged --- */
  const handleDragStart = useCallback((name: string) => {
    draggedEquipmentRef.current = name;
  }, []);

  /* --- Drop zone ref for the calendar wrapper --- */
  const [, dropRef] = useDrop(
    () => ({
      accept: EQUIPMENT_DND_TYPE,
      drop: () => {
        /* handled by the calendar's onDropFromOutside */
      },
    }),
    [],
  );

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Admin
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Agenda
        </h1>
        <p className="text-sm text-white/70">
          Arrasta equipamentos para o calendário para criar eventos. Clica num
          slot vazio para adicionar manualmente.
        </p>
      </header>

      {/* Main layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar — Equipments */}
        <aside className={`${cardClass} w-full shrink-0 p-5 lg:w-72`}>
          <div className="mb-4 flex items-center gap-2">
            <GripVertical size={16} className="text-white/40" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Equipamentos
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
              value={eqInput}
              onChange={(e) => setEqInput(e.target.value)}
              placeholder="Novo equipamento…"
              className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!eqInput.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
              title="Adicionar"
            >
              <Plus size={16} />
            </button>
          </form>

          {equipments.length === 0 ? (
            <p className="py-4 text-center text-xs text-white/40">
              Adiciona equipamentos para arrastar para o calendário.
            </p>
          ) : (
            <div className="space-y-2">
              {equipments.map((eq) => (
                <div key={eq} draggable onDragStart={() => handleDragStart(eq)}>
                  <DraggableEquipment
                    name={eq}
                    onRemove={() => removeEquipment(eq)}
                  />
                </div>
              ))}
            </div>
          )}

          {events.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/50">
                Eventos ({events.length})
              </h3>
              <ul className="space-y-1">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/70"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: ev.color || "#6366f1" }}
                    />
                    <span className="flex-1 truncate">{ev.title}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEvents((prev) => prev.filter((e) => e.id !== ev.id))
                      }
                      className="shrink-0 text-white/30 transition hover:text-red-300"
                      title="Apagar evento"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* Calendar */}
        <div
          ref={(node) => {
            dropRef(node);
            (
              calendarRef as React.MutableRefObject<HTMLDivElement | null>
            ).current = node;
          }}
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
              onDropFromOutside={handleDropFromOutside}
              dragFromOutsideItem={() =>
                ({
                  id: "__drag",
                  title: "",
                  start: new Date(),
                  end: new Date(),
                }) as AgendaEvent
              }
              eventPropGetter={eventStyleGetter}
              messages={messages}
              culture="pt-BR"
              min={new Date(1970, 0, 1, 7, 0, 0)}
              max={new Date(1970, 0, 1, 22, 0, 0)}
              style={{ height: "100%" }}
              tooltipAccessor={(ev) => ev.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================= Page wrapper with DndProvider ========================= */

export default function AgendaPage() {
  return (
    <DndProvider backend={HTML5Backend}>
      <AgendaContent />
    </DndProvider>
  );
}
