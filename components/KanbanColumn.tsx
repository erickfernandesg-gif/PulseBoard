"use client";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { KanbanTask } from "./KanbanTask";

export function KanbanColumn({
  column,
  tasks,
  profiles,
  onTaskUpdated,
  onTaskDeleted,
}: any) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className="flex w-[280px] sm:w-80 shrink-0 flex-col rounded-xl bg-zinc-900/50 p-4 border border-zinc-800"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-300">{column.title}</h3>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-400">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto min-h-[150px]">
        <SortableContext
          items={tasks.map((t: any) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task: any) => (
            <KanbanTask
              key={task.id}
              task={task}
              profiles={profiles}
              onTaskUpdated={onTaskUpdated}
              onTaskDeleted={onTaskDeleted}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
