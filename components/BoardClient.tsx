"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "./KanbanBoard";
import { TableBoard } from "./TableBoard";
import { GanttBoard } from "./GanttBoard";
import { LayoutGrid, List, Calendar, Loader2, RefreshCw, ShieldCheck, Zap, AlertCircle } from "lucide-react";
import { CreateTaskModal } from "./CreateTaskModal";
import { cn } from "@/utils/cn";
import { createClient } from "@/utils/supabase/client";
import { FullTaskData } from "./KanbanTask"; // Import the shared Task type
import { toast } from "sonner";

// Define ProfileData type based on what's fetched
interface ProfileData {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export function BoardClient({
  board,
  initialTasks,
  profiles,
}: {
  board: any;
  initialTasks: FullTaskData[]; // Use the shared type
  profiles: ProfileData[]; // Use the defined type
}) {
  const [view, setView] = useState<"kanban" | "table" | "gantt">("kanban");
  const [tasks, setTasks] = useState<FullTaskData[]>(initialTasks); // State also uses the shared type
  const [isRefreshing, setIsRefreshing] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Função para recarregar as tarefas e garantir que os dados novos (clientes, datas, colaboradores) apareçam
  const refreshTasks = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // router.refresh() força o Next.js a buscar os Server Components novamente
      router.refresh(); 
      
      // QUERY CRÍTICA: Agora buscamos os perfis e os clientes associados!
      const { data, error } = await supabase
        .from("tasks")
        .select("*, profiles(full_name, avatar_url), clients(name), task_collaborators(user_id)")
        .eq("board_id", board.id)
        .order("position_index", { ascending: true });
      
      if (error) throw error;
      if (data) setTasks(data as FullTaskData[]); // Cast to the correct type
    } catch (error: any) {
      console.error("Erro ao sincronizar tarefas:", error);
      toast.error("Erro ao sincronizar dados com o servidor.");
    } finally {
      setIsRefreshing(false);
    }
  }, [board.id, supabase, router]);

  // Sincronização Real-time (Padrão Internacional)
  useEffect(() => {
    const channel = supabase
      .channel(`board-changes-${board.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `board_id=eq.${board.id}` },
        () => {
          refreshTasks(); // Recarrega os dados quando qualquer tarefa do board mudar
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [board.id, supabase, refreshTasks]);

  const handleTaskCreated = (newTask: any) => {
    // Ao criar, recarregamos para pegar as relações (profiles, clients) corretamente do banco
    refreshTasks();
  };

  const handleTaskUpdated = () => {
    // Chamado pelo Kanban, Table ou Modal após um Update bem-sucedido
    refreshTasks();
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter((t) => t.id !== taskId));
  };

  // Cálculo do Índice de Resiliência (ORI)
  const boardStats = useMemo(() => {
    if (!tasks || tasks.length === 0) return { score: 100, silos: 0, debt: 0 };
    
    const silos = tasks.filter(t => t.assigned_to && t.task_collaborators?.length === 0 && t.status !== 'done').length;
    const debt = tasks.filter(t => (t.estimated_minutes || 0) > 0 && (t.total_minutes_spent || 0) > (t.estimated_minutes || 0) * 1.25).length;
    
    // O score diminui conforme os silos e dívidas aumentam
    const score = Math.max(0, 100 - (silos * 10) - (debt * 5));
    return { score, silos, debt };
  }, [tasks]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/30 p-4 md:p-8">
      {/* BARRA DE RESILIÊNCIA OPERACIONAL (FUSÃO ENTERPRISE 2.0) */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className={cn(
            "p-3 rounded-lg border",
            boardStats.score > 80 ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"
          )}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Operational Resilience Index (ORI)</p>
            <p className="text-xl font-black text-slate-900">{boardStats.score}<span className="text-slate-500 text-sm ml-1">%</span></p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-600 rounded-lg">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Silos de Conhecimento</p>
            <p className="text-xl font-bold text-slate-900">{boardStats.silos} <span className="text-xs text-slate-500 font-normal">cards em risco</span></p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dívida Cognitiva</p>
            <p className="text-xl font-bold text-slate-900">{boardStats.debt} <span className="text-xs text-slate-500 font-normal">atividades estouradas</span></p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        {/* Lado Esquerdo: Seletor de Visualização e Status */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex w-full sm:w-auto overflow-x-auto items-center space-x-2 rounded-lg bg-slate-200/50 p-1 border border-slate-200">
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "flex items-center rounded-md px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                view === "kanban"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900",
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
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900",
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
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Gantt
            </button>
          </div>

          {/* Feedback de Sincronização */}
          {isRefreshing && (
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
              <RefreshCw size={12} className="animate-spin" />
              Sincronizando
            </span>
          )}
        </div>

        {/* Lado Direito: Ações do Quadro */}
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <CreateTaskModal
            boardId={board.id}
            profiles={profiles}
            onTaskCreated={handleTaskCreated}
          />
        </div>
      </div>

      {/* Área de Conteúdo dos Boards */}
      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {view === "kanban" && (
          <KanbanBoard
            board={board} 
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