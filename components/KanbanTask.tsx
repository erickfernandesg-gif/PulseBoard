"use client";

import { Draggable } from "@hello-pangea/dnd";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, User } from "lucide-react";
import { TaskDetailsModal } from "./TaskDetailsModal";
import { cn } from "@/utils/cn";

export function KanbanTask({ task, index, onTaskUpdated, onTaskDeleted }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const priorityColors: Record<string, string> = {
    low: "bg-zinc-800 text-zinc-300 border-zinc-700",
    medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    critical: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    critical: "Crítica",
  };

  return (
    <>
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setIsModalOpen(true)}
            className={cn(
              "group flex cursor-grab flex-col gap-3 rounded-xl border bg-zinc-950 p-4 shadow-sm transition-all hover:border-indigo-500/50 active:cursor-grabbing",
              snapshot.isDragging ? "rotate-2 scale-105 border-indigo-500 shadow-2xl z-50 ring-2 ring-indigo-500/20 opacity-90" : "border-zinc-800"
            )}
            style={{
              ...provided.draggableProps.style,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                  priorityColors[task.priority || "medium"]
                )}
              >
                {priorityLabels[task.priority || "medium"]}
              </span>
            </div>

            <div>
              <h4 className="font-semibold text-white text-sm">{task.title}</h4>
              {task.description && (
                <p className="mt-2 line-clamp-2 text-xs text-zinc-500">
                  {task.description}
                </p>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-zinc-800/50 pt-3">
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                {task.due_date ? (
                  <div className="flex items-center gap-1 font-medium">
                    <Calendar size={12} />
                    <span>{format(new Date(task.due_date), "dd/MM", { locale: ptBR })}</span>
                  </div>
                ) : (
                  <span className="italic text-zinc-600">Sem prazo</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {task.assigned_to ? (
                  <div 
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white uppercase shadow-sm"
                    title={task.profiles?.full_name || "Usuário"}
                  >
                    {task.profiles?.full_name?.charAt(0) || <User size={12} />}
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-500">
                    <User size={12} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>

      {isModalOpen && (
        <TaskDetailsModal
          task={task}
          onClose={() => setIsModalOpen(false)}
          onTaskUpdated={onTaskUpdated}
          onTaskDeleted={onTaskDeleted}
        />
      )}
    </>
  );
}