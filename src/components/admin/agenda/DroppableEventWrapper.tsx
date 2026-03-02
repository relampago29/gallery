"use client";

import React from "react";
import { useDrop } from "react-dnd";
import {
  EQUIPMENT_DND_TYPE,
  type EquipmentDragItem,
} from "./DraggableEquipment";

type Props = {
  eventId: string;
  children: React.ReactNode;
  onDropEquipment: (eventId: string, equipmentId: string) => void;
};

export function DroppableEventWrapper({
  eventId,
  children,
  onDropEquipment,
}: Props) {
  const [{ isOver, canDrop }, dropRef] = useDrop<
    EquipmentDragItem,
    void,
    { isOver: boolean; canDrop: boolean }
  >(
    () => ({
      accept: EQUIPMENT_DND_TYPE,
      drop: (item) => {
        onDropEquipment(eventId, item.id);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [eventId, onDropEquipment],
  );

  return (
    <div
      ref={dropRef as unknown as React.Ref<HTMLDivElement>}
      className={`relative h-full w-full transition-all ${
        isOver && canDrop
          ? "ring-2 ring-indigo-400/70 ring-offset-1 ring-offset-transparent brightness-125"
          : canDrop
            ? "ring-1 ring-indigo-400/30"
            : ""
      }`}
    >
      {children}
    </div>
  );
}
