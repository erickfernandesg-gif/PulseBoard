"use client";

import { Droppable } from "@hello-pangea/dnd";
import { KanbanTask } from "./KanbanTask";

export function KanbanColumn({ column, tasks, profiles, onTaskUpdated, onTaskDeleted }: any) {
  return (
    <div className="flex w-80 flex-col rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex-shrink-0 max-h-full">
      <div className="flex items-center justify-between border-b border-zinc-800/50 p-4">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider">{column.title}</h3>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
          {tasks.length}
        </span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-3 custom-scrollbar min-h-[150px] transition-colors ${
              snapshot.isDraggingOver ? "bg-indigo-500/5" : ""
            }`}
          >
            <div className="flex flex-col gap-3">
              {tasks.map((task: any, index: number) => (
                <KanbanTask
                  key={task.id}
                  task={task}
                  index={index}
                  profiles={profiles}
                  onTaskUpdated={onTaskUpdated}
                  onTaskDeleted={onTaskDeleted}
                />
              ))}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
    </div>
  );
}