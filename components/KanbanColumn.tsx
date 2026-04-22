"use client";

import { Droppable } from "@hello-pangea/dnd";
import { KanbanTask, FullTaskData } from "./KanbanTask"; // Import FullTaskData

// Define ProfileData type based on what's fetched (from BoardClient)
interface ProfileData {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export function KanbanColumn({ column, tasks, profiles, onTaskUpdated, onTaskDeleted }: { column: any; tasks: FullTaskData[]; profiles: ProfileData[]; onTaskUpdated?: () => void; onTaskDeleted?: (taskId: string) => void; }) {
  return (
    <div className="flex w-80 flex-col rounded-xl bg-slate-50 border border-slate-200 flex-shrink-0 max-h-full shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200/50 p-4">
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">{column.title}</h3>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500 shadow-sm">
          {tasks.length}
        </span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            /* CORREÇÃO DA COLUNA: Adicionamos o gap-3 aqui, e removemos a div interna extra. 
               Isto é crucial para o cálculo correto da biblioteca.
            */
            className={`flex-1 flex flex-col gap-3 overflow-y-auto p-3 custom-scrollbar min-h-[150px] transition-colors ${
              snapshot.isDraggingOver ? "bg-indigo-500/5" : ""
            }`}
          >
            {tasks.map((task: FullTaskData, index: number) => (
              <KanbanTask
                key={task.id}
                task={task}
                index={index}
                onTaskUpdated={onTaskUpdated}
                onTaskDeleted={onTaskDeleted}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}