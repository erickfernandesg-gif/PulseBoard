"use client";

import { useState, useMemo, useEffect } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function KanbanBoard({
  board,
  tasks,
  setTasks,
  profiles,
  onTaskUpdated,
  onTaskDeleted,
}: any) {
  const [isMounted, setIsMounted] = useState(false);
  const supabase = createClient();

  // Evita erros de hidratação do Next.js
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const COLUMNS = useMemo(() => {
    if (board?.settings && Array.isArray(board.settings)) {
      return board.settings;
    }
    return [
      { id: "todo", title: "A Fazer" },
      { id: "in-progress", title: "Em Execução" },
      { id: "homologation", title: "Homologação" },
      { id: "production", title: "Produção" },
      { id: "done", title: "Concluído" },
    ];
  }, [board?.settings]);

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    // Se soltou fora de uma coluna válida, cancela
    if (!destination) return;
    
    // Se soltou no mesmo lugar que estava, cancela
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    
    // 1. Atualização Otimista: Muda na tela na mesma hora para sensação de fluidez
    setTasks((prev: any) => {
      const updated = [...prev];
      const taskIndex = updated.findIndex((t: any) => t.id === draggableId);
      if (taskIndex > -1) {
        updated[taskIndex] = { ...updated[taskIndex], status: newStatus };
      }
      return updated;
    });

    // Se apenas reordenou na mesma coluna, não salva no banco (a menos que você queira salvar a ordem dps)
    if (source.droppableId === destination.droppableId) return;

    // 2. Salva o novo status no banco de dados
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
    <div className="flex h-full w-full overflow-x-auto p-4 custom-scrollbar bg-zinc-950/20">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 min-w-max pb-4 h-full items-start">
          {COLUMNS.map((col: any) => {
            const columnTasks = tasks.filter((t: any) => t.status === col.id);
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
  );
}