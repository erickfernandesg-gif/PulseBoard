"use client";

import { useState } from "react";
import { KanbanBoard } from "./KanbanBoard";
import { TableBoard } from "./TableBoard";
import { GanttBoard } from "./GanttBoard";
import { LayoutGrid, List, Plus, Calendar } from "lucide-react";
import { CreateTaskModal } from "./CreateTaskModal";
import { cn } from "@/utils/cn";

export function BoardClient({
  board,
  initialTasks,
  profiles,
}: {
  board: any;
  initialTasks: any[];
  profiles: any[];
}) {
  const [view, setView] = useState<"kanban" | "table" | "gantt">("kanban");
  const [tasks, setTasks] = useState(initialTasks);

  const handleTaskCreated = (newTask: any) => {
    setTasks([...tasks, newTask]);
  };

  const handleTaskUpdated = (updatedTask: any) => {
    setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex w-full sm:w-auto overflow-x-auto items-center space-x-2 rounded-lg bg-zinc-900/50 p-1 border border-zinc-800">
          <button
            onClick={() => setView("kanban")}
            className={cn(
              "flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              view === "kanban"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Kanban
          </button>
          <button
            onClick={() => setView("table")}
            className={cn(
              "flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              view === "table"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            <List className="mr-2 h-4 w-4" />
            Tabela
          </button>
          <button
            onClick={() => setView("gantt")}
            className={cn(
              "flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              view === "gantt"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Gantt
          </button>
        </div>

        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <CreateTaskModal
            boardId={board.id}
            profiles={profiles}
            onTaskCreated={handleTaskCreated}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
        {view === "kanban" && (
          <KanbanBoard
            tasks={tasks}
            setTasks={setTasks}
            profiles={profiles}
            onTaskUpdated={handleTaskUpdated}
            onTaskDeleted={handleTaskDeleted}
          />
        )}
        {view === "table" && (
          <TableBoard
            tasks={tasks}
            setTasks={setTasks}
            profiles={profiles}
            onTaskUpdated={handleTaskUpdated}
            onTaskDeleted={handleTaskDeleted}
          />
        )}
        {view === "gantt" && (
          <GanttBoard tasks={tasks} />
        )}
      </div>
    </div>
  );
}
