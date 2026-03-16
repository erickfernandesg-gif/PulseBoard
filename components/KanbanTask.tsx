"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MoreHorizontal, User, AlertCircle } from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/utils/cn";
import { TaskDetailsModal } from "./TaskDetailsModal";

export function KanbanTask({
  task,
  profiles,
  onTaskUpdated,
  onTaskDeleted,
}: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform), // Usar Translate evita distorções no card
    zIndex: isDragging ? 50 : 0,
  };

  // Lógica de exibição da data
  const getDueDateDisplay = () => {
    if (!task.due_date) return null;
    try {
      const date = parseISO(task.due_date);
      return {
        label: format(date, "dd 'de' MMM", { locale: ptBR }),
        isUrgent: isPast(date) && !isToday(date) && task.status !== "done",
        isToday: isToday(date)
      };
    } catch (e) {
      return null;
    }
  };

  const dateInfo = getDueDateDisplay();

  const priorityColors: Record<string, string> = {
    low: "bg-zinc-800 text-zinc-300 border-zinc-700",
    medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    urgent: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        // O segredo está aqui: o onClick abre o modal, mas os listeners cuidam do drag
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className={cn(
          "group relative flex cursor-grab flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-sm transition-all hover:border-zinc-700 active:cursor-grabbing",
          isDragging && "opacity-50 ring-2 ring-indigo-500",
        )}
      >
        <div className="flex items-start justify-between">
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              priorityColors[task.priority] || priorityColors.medium,
            )}
          >
            {task.priority}
          </span>
          <button className="text-zinc-500 opacity-0 transition-opacity hover:text-zinc-300 group-hover:opacity-100">
            <MoreHorizontal size={14} />
          </button>
        </div>

        <div>
          <h4 className="text-sm font-medium text-zinc-100 line-clamp-2 leading-snug">
            {task.title}
          </h4>
          {task.description && (
            <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-zinc-800 pt-3">
          <div className={cn(
            "flex items-center text-[11px]",
            dateInfo?.isUrgent ? "text-red-400 font-medium" : "text-zinc-500",
            dateInfo?.isToday ? "text-amber-400 font-medium" : ""
          )}>
            {dateInfo?.isUrgent ? (
              <AlertCircle className="mr-1 h-3 w-3" />
            ) : (
              <Calendar className="mr-1 h-3 w-3" />
            )}
            {dateInfo ? dateInfo.label : "Sem prazo"}
          </div>

          <div className="flex -space-x-2">
            {task.profiles ? (
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-zinc-950 bg-indigo-600 text-[10px] font-bold text-white shadow-sm"
                title={task.profiles.full_name || "Membro"}
              >
                {task.profiles.full_name?.charAt(0).toUpperCase() || <User size={10} />}
              </div>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-600">
                <User size={10} />
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <TaskDetailsModal 
          task={task} 
          onClose={() => setIsModalOpen(false)} 
          // Importante passar as funções para o modal poder atualizar a data também
          onTaskUpdated={onTaskUpdated}
          onTaskDeleted={onTaskDeleted}
        />
      )}
    </>
  );
}