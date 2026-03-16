"use client";

import { useState, useCallback } from "react";
import { KanbanBoard } from "./KanbanBoard";
import { TableBoard } from "./TableBoard";
import { GanttBoard } from "./GanttBoard";
import { LayoutGrid, List, Calendar } from "lucide-react";
import { CreateTaskModal } from "./CreateTaskModal";
import { cn } from "@/utils/cn";
import { createClient } from "@/utils/supabase/client";

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
  const supabase = createClient();

  // Função para recarregar as tarefas e garantir que os dados novos (datas, colaboradores) apareçam
  const refreshTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*, profiles(full_name, avatar_url)")
      .eq("board_id", board.id)
      .order("position_index", { ascending: true });
    
    if (data) setTasks(data);
  }, [board.id, supabase]);

  const handleTaskCreated = (newTask: any) => {
    // Ao criar, recarregamos para pegar as relações (profiles) corretamente do banco
    refreshTasks();
  };

  const handleTaskUpdated = () => {
    // Chamado pelo Kanban ou Modal após um Update bem-sucedido
    refreshTasks();
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter((t) => t.id !== taskId));
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Seletor de Visualização */}
        <div className="flex w-full sm:w-auto overflow-x-auto items-center space-x-2 rounded-lg bg-zinc-900/50 p-1 border border-zinc-800 shadow-inner">
          <button
            onClick={() => setView("kanban")}
            className={cn(
              "flex items-center rounded-md px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
              view === "kanban"
                ? "bg-zinc-800 text-indigo-400 shadow-sm ring-1 ring-zinc-700"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Kanban
          </button>
          <button
            onClick={() => setView("table")}
            className={cn(
              "flex items-center rounded-md px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
              view === "table"
                ? "bg-zinc-800 text-indigo-400 shadow-sm ring-1 ring-zinc-700"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <List className="mr-2 h-4 w-4" />
            Tabela
          </button>
          <button
            onClick={() => setView("gantt")}
            className={cn(
              "flex items-center rounded-md px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
              view === "gantt"
                ? "bg-zinc-800 text-indigo-400 shadow-sm ring-1 ring-zinc-700"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Gantt
          </button>
        </div>

        {/* Ações do Quadro */}
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <CreateTaskModal
            boardId={board.id}
            profiles={profiles}
            onTaskCreated={handleTaskCreated}
          />
        </div>
      </div>

      {/* Área de Conteúdo dos Boards */}
      <div className="flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md">
        {view === "kanban" && (
          <KanbanBoard
            board={board} // PASSO CRÍTICO: Entregando as configurações do quadro (colunas dinâmicas)
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