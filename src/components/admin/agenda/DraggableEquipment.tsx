"use client";

import { useDrag, DragSourceMonitor } from "react-dnd";
import { Grip } from "lucide-react";

export const EQUIPMENT_DND_TYPE = "equipment";

export type EquipmentDragItem = {
  type: typeof EQUIPMENT_DND_TYPE;
  name: string;
};

type Props = {
  name: string;
  onRemove?: () => void;
};

export function DraggableEquipment({ name, onRemove }: Props) {
  const [{ isDragging }, dragRef] = useDrag<
    EquipmentDragItem,
    void,
    { isDragging: boolean }
  >(() => ({
    type: EQUIPMENT_DND_TYPE,
    item: { type: EQUIPMENT_DND_TYPE, name },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={dragRef as unknown as React.Ref<HTMLDivElement>}
      className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition select-none ${
        isDragging
          ? "border-white/40 bg-white/15 opacity-60"
          : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
      } cursor-grab active:cursor-grabbing`}
    >
      <Grip size={14} className="shrink-0 text-white/40" />
      <span className="flex-1 truncate text-white/90">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto shrink-0 rounded-full p-0.5 text-white/30 opacity-0 transition hover:bg-white/10 hover:text-red-300 group-hover:opacity-100"
          title="Remover equipamento"
        >
          ×
        </button>
      )}
    </div>
  );
}
