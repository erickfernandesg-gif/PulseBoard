"use client";

import { useState, useMemo, useEffect } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Filter, Inbox, CalendarDays, Layers, User, Search } from "lucide-react";
import { FullTaskData } from "./KanbanTask"; // Import the shared Task type

interface KanbanBoardProps {
  board: { id: string; settings?: { id: string; title: string }[] };
  tasks: FullTaskData[];
  setTasks: React.Dispatch<React.SetStateAction<FullTaskData[]>>;
  profiles: { id: string; full_name: string; avatar_url: string | null }[];
  onTaskUpdated?: () => void;
  onTaskDeleted?: (taskId: string) => void;
}

export function KanbanBoard({
  board,
  tasks,
  setTasks,
  profiles,
  onTaskUpdated,
  onTaskDeleted,
}: KanbanBoardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  // Evita erros de hidratação do Next.js
  useEffect(() => {
    setIsMounted(true);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });

    // ✅ MELHORIA SÊNIOR: Inscrição em Tempo Real (Padrão Monday/Trello)
    const channel = supabase
      .channel(`board-changes-${board.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `board_id=eq.${board.id}` },
        () => {
          // Quando algo mudar no banco (por outro usuário ou automação), atualizamos a lista
          if (onTaskUpdated) onTaskUpdated();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 1. Definição das Colunas (Agora com a Caixa de Entrada)
  const COLUMNS = useMemo(() => {
    // Se o usuário customizou as colunas no banco, usamos elas.
    if (board?.settings && Array.isArray(board.settings) && (board.settings as any[]).length > 0) {
      // Garante que a coluna backlog exista, se não existir, adiciona no início
      const hasBacklog = board.settings.some((c: any) => c.id === "backlog");
      if (!hasBacklog) return [{ id: "backlog", title: "Caixa de Entrada" }, ...board.settings];
      return board.settings;
    }
    return [
      { id: "backlog", title: "Caixa de Entrada" },
      { id: "todo", title: "A Fazer" },
      { id: "in-progress", title: "Em Execução" },
      { id: "homologation", title: "Homologação" },
      { id: "production", title: "Produção" },
      { id: "done", title: "Concluído" },
    ];
  }, [board?.settings]);

  // 2. Motor de Filtros (Extrai os meses dinamicamente das tarefas)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    tasks.forEach((t: FullTaskData) => { // Use FullTaskData
      if (t.target_month) months.add(t.target_month);
    });
    // Ordena do mais recente para o mais antigo (ex: 2026-05, 2026-04)
    return Array.from(months).sort().reverse(); 
  }, [tasks]);

  // Formata "2026-04" para "Abril 2026"
  const formatMonthLabel = (yyyy_mm: string) => {
    if (!yyyy_mm) return "";
    const [year, month] = yyyy_mm.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  // 3. Aplica o filtro selecionado
  const filteredTasks = useMemo(() => {
    return tasks.filter((t: FullTaskData) => {
      const matchMonth = selectedMonth === "all" || (selectedMonth === "inbox" ? !t.target_month : t.target_month === selectedMonth);
      const isCollaborator = t.task_collaborators?.some((c) => c.user_id === filterUserId);
      const matchUser = filterUserId === "all" || t.assigned_to === filterUserId || isCollaborator;
      
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchMonth && matchUser && matchSearch;
    });
  }, [tasks, selectedMonth, filterUserId, searchQuery]);

  // 4. Lógica de arrastar e soltar
  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const movedTask = tasks.find((t) => t.id === draggableId);
    if (!movedTask) return;

    // 1. Identificar vizinhos na lista FILTRADA para calcular a nova posição
    let prevTask, nextTask;
    const destColumnTasks = tasks.filter(t => t.status === newStatus).sort((a,b) => (a.position_index || 0) - (b.position_index || 0));
    
    if (source.droppableId === newStatus) {
      const colItems = [...destColumnTasks];
      const [removed] = colItems.splice(source.index, 1);
      colItems.splice(destination.index, 0, removed);
      prevTask = colItems[destination.index - 1];
      nextTask = colItems[destination.index + 1];
    } else {
      prevTask = destColumnTasks[destination.index - 1];
      nextTask = destColumnTasks[destination.index];
    }

    // 2. Algoritmo de Posicionamento (Evita colisões de INTEGER)
    let newPos;
    const prevIdx = prevTask ? prevTask.position_index : null;
    const nextIdx = nextTask ? nextTask.position_index : null;

    // Usamos um gap de 16384 (2^14) para permitir muitas inserções intermediárias
    if (prevIdx === null && nextIdx === null) newPos = 16384;
    else if (prevIdx === null) newPos = nextIdx! - 16384;
    else if (nextIdx === null) newPos = prevIdx! + 16384;
    else newPos = Math.floor((prevIdx! + nextIdx!) / 2);

    // Tratamento de colisão: se não houver espaço entre os inteiros
    if (newPos === prevIdx) newPos = prevIdx! + 1;

    // 3. Atualização Otimista Imediata
    const updatedTasks = tasks.map(t => 
      t.id === draggableId ? { ...t, status: newStatus, position_index: newPos } : t
    ).sort((a, b) => (a.position_index || 0) - (b.position_index || 0));

    setTasks(updatedTasks);

    // Salva no banco de dados
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: newStatus,
          position_index: newPos 
        })
        .eq("id", draggableId);

      if (error) throw error;
      if (onTaskUpdated) onTaskUpdated();
    } catch (error: any) {
      toast.error("Erro ao salvar mudança no banco.");
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50">
      
      {/* BARRA DE FILTROS (A Mágica do SaaS) */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {/* Campo de Pesquisa Rápida */}
          <div className="relative mr-4 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder="Pesquisar tarefas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-64 rounded-lg bg-slate-50 border border-slate-200 pl-9 pr-4 text-xs text-slate-700 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold">ESC</button>
            )}
          </div>

        <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mr-2">
          <Filter size={14} /> Visão:
        </span>
        
        <button
          onClick={() => setSelectedMonth("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
            selectedMonth === "all" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Layers size={14} /> Tudo
        </button>

        <button
          onClick={() => setSelectedMonth("inbox")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
            selectedMonth === "inbox" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Inbox size={14} /> Sem Mês Definido (Triagem)
        </button>

        <div className="h-4 w-px bg-slate-200 mx-2"></div>

        {availableMonths.map(month => (
          <button
            key={month}
            onClick={() => setSelectedMonth(month)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              selectedMonth === month ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <CalendarDays size={14} /> {formatMonthLabel(month)}
          </button>
        ))}
        </div>

        {/* Filtro de Usuário (Lado Direito) */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-4">
          <button
            onClick={() => setFilterUserId(currentUserId || "all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              filterUserId === currentUserId ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <User size={14} /> Ver apenas eu
          </button>
          <select 
            value={filterUserId} 
            onChange={(e) => setFilterUserId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="all">Time Completo</option>
            {profiles.map((p: any) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* QUADRO KANBAN */}
      <div className="flex-1 overflow-x-auto p-4 custom-scrollbar select-none">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 min-w-max pb-4 h-full items-start transform-none">
            {COLUMNS.map((col: any) => {
              const columnTasks = filteredTasks.filter((t: FullTaskData) => t.status === col.id); // Use FullTaskData
              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={columnTasks}
                  profiles={profiles}
                  onTaskUpdated={onTaskUpdated}
                  onTaskDeleted={onTaskDeleted}
                />
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}