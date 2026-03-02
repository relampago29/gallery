"use client";

import React from "react";
import { useDrag } from "react-dnd";
import { Grip } from "lucide-react";

export const EQUIPMENT_DND_TYPE = "equipment";

export type EquipmentDragItem = {
  type: typeof EQUIPMENT_DND_TYPE;
  id: string;
  name: string;
};

type Props = {
  id: string;
  name: string;
  iconCls?: string;
  onRemove?: () => void;
};

export function DraggableEquipment({ id, name, iconCls, onRemove }: Props) {
  const [{ isDragging }, dragRef] = useDrag<
    EquipmentDragItem,
    void,
    { isDragging: boolean }
  >(() => ({
    type: EQUIPMENT_DND_TYPE,
    item: { type: EQUIPMENT_DND_TYPE, id, name },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={dragRef as unknown as React.Ref<HTMLDivElement>}
      className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition select-none ${
        isDragging
          ? "border-indigo-400/50 bg-indigo-500/15 opacity-50 scale-95"
          : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
      } cursor-grab active:cursor-grabbing`}
    >
      {iconCls ? (
        <span className="shrink-0 text-base text-indigo-300">{iconCls}</span>
      ) : (
        <Grip size={14} className="shrink-0 text-white/40" />
      )}
      <span className="flex-1 truncate text-white/90">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-auto shrink-0 rounded-full p-0.5 text-white/30 opacity-0 transition hover:bg-white/10 hover:text-red-300 group-hover:opacity-100"
          title="Remover equipamento"
        >
          ×
        </button>
      )}
    </div>
  );
}
