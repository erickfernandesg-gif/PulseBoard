"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MoreHorizontal, User } from "lucide-react";
import { format } from "date-fns";
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
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-32 w-full rounded-lg border-2 border-indigo-500 bg-indigo-500/10 opacity-50"
      />
    );
  }

  const priorityColors: Record<string, string> = {
    low: "bg-zinc-800 text-zinc-300",
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
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "group relative flex cursor-grab flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-sm transition-all hover:border-zinc-700 active:cursor-grabbing",
          isDragging && "opacity-50",
        )}
      >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
            priorityColors[task.priority] || priorityColors.medium,
          )}
        >
          {task.priority}
        </span>
        <button className="text-zinc-500 opacity-0 transition-opacity hover:text-zinc-300 group-hover:opacity-100">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <div>
        <h4 className="font-medium text-zinc-100 line-clamp-2">{task.title}</h4>
        {task.description && (
          <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-zinc-800 pt-3">
        <div className="flex items-center text-xs text-zinc-500">
          <Calendar className="mr-1.5 h-3.5 w-3.5" />
          {task.due_date ? format(new Date(task.due_date), "MMM d") : "No date"}
        </div>

        <div className="flex -space-x-2">
          {task.profiles ? (
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-zinc-950 bg-indigo-500 text-[10px] font-medium text-white"
              title={task.profiles.full_name || "User"}
            >
              {task.profiles.full_name?.charAt(0) || <User size={12} />}
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-800 text-zinc-500">
              <User size={12} />
            </div>
          )}
        </div>
      </div>
      </div>
      {isModalOpen && (
        <TaskDetailsModal task={task} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
