"use client";

import { useState, useMemo, useEffect } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Filter, Inbox, CalendarDays, Layers } from "lucide-react";

export function KanbanBoard({
  board,
  tasks,
  setTasks,
  profiles,
  onTaskUpdated,
  onTaskDeleted,
}: any) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const supabase = createClient();

  // Evita erros de hidratação do Next.js
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Definição das Colunas (Agora com a Caixa de Entrada)
  const COLUMNS = useMemo(() => {
    // Se o usuário customizou as colunas no banco, usamos elas.
    // Dica: Se quiser forçar o "backlog" sempre, podemos injetar aqui futuramente.
    if (board?.settings && Array.isArray(board.settings) && board.settings.length > 0) {
      return board.settings;
    }
    return [
      { id: "backlog", title: "Caixa de Entrada" }, // <-- NOVA COLUNA (Triagem)
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
    tasks.forEach((t: any) => {
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
    if (selectedMonth === "all") return tasks;
    if (selectedMonth === "inbox") return tasks.filter((t: any) => !t.target_month);
    return tasks.filter((t: any) => t.target_month === selectedMonth);
  }, [tasks, selectedMonth]);

  // 4. Lógica de arrastar e soltar
  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    
    // Atualização Otimista
    setTasks((prev: any) => {
      const updated = [...prev];
      const taskIndex = updated.findIndex((t: any) => t.id === draggableId);
      if (taskIndex > -1) {
        updated[taskIndex] = { ...updated[taskIndex], status: newStatus };
      }
      return updated;
    });

    if (source.droppableId === destination.droppableId) return;

    // Salva no banco de dados
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", draggableId);

      if (error) throw error;
      if (onTaskUpdated) onTaskUpdated();
    } catch (error: any) {
      toast.error("Erro ao salvar mudança no banco.");
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950/20">
      
      {/* BARRA DE FILTROS (A Mágica do SaaS) */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-800/50 bg-zinc-900/30 overflow-x-auto custom-scrollbar">
        <span className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1 mr-2">
          <Filter size={14} /> Visão:
        </span>
        
        <button
          onClick={() => setSelectedMonth("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
            selectedMonth === "all" ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Layers size={14} /> Tudo
        </button>

        <button
          onClick={() => setSelectedMonth("inbox")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
            selectedMonth === "inbox" ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Inbox size={14} /> Sem Mês Definido (Triagem)
        </button>

        <div className="h-4 w-px bg-zinc-700 mx-2"></div>

        {availableMonths.map(month => (
          <button
            key={month}
            onClick={() => setSelectedMonth(month)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              selectedMonth === month ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <CalendarDays size={14} /> {formatMonthLabel(month)}
          </button>
        ))}
      </div>

      {/* QUADRO KANBAN */}
      <div className="flex-1 overflow-x-auto p-4 custom-scrollbar">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 min-w-max pb-4 h-full items-start">
            {COLUMNS.map((col: any) => {
              const columnTasks = filteredTasks.filter((t: any) => t.status === col.id);
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