"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanTask } from "./KanbanTask";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function KanbanBoard({
  board, // 1. Agora recebemos o objeto board completo do banco
  tasks,
  setTasks,
  profiles,
  onTaskUpdated,
  onTaskDeleted,
}: any) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const supabase = createClient();

  // 2. Lógica de Colunas Dinâmicas
  // O useMemo garante que se as configurações do quadro mudarem, o Kanban se adapta na hora.
  const COLUMNS = useMemo(() => {
    // Se o quadro tiver configurações de colunas no JSONB 'settings', usamos elas.
    // Caso contrário, usamos um padrão robusto que atende os dois mundos.
    if (board?.settings && Array.isArray(board.settings)) {
      return board.settings;
    }

    // Padrão de fallback (caso o board ainda não tenha a coluna settings configurada)
    return [
      { id: "todo", title: "A Fazer" },
      { id: "in-progress", title: "Em Execução" },
      { id: "homologation", title: "Homologação" },
      { id: "production", title: "Produção" },
      { id: "done", title: "Concluído" },
    ];
  }, [board?.settings]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeTask = useMemo(
    () => tasks.find((t: any) => t.id === activeId),
    [activeId, tasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    if (isActiveTask && isOverTask) {
      setTasks((prevTasks: any) => {
        const activeIndex = prevTasks.findIndex((t: any) => t.id === activeId);
        const overIndex = prevTasks.findIndex((t: any) => t.id === overId);

        if (prevTasks[activeIndex].status !== prevTasks[overIndex].status) {
          const updatedTasks = [...prevTasks];
          updatedTasks[activeIndex].status = prevTasks[overIndex].status;
          return arrayMove(updatedTasks, activeIndex, overIndex);
        }
        return arrayMove(prevTasks, activeIndex, overIndex);
      });
    }

    if (isActiveTask && isOverColumn) {
      setTasks((prevTasks: any) => {
        const activeIndex = prevTasks.findIndex((t: any) => t.id === activeId);
        const updatedTasks = [...prevTasks];
        updatedTasks[activeIndex].status = overId;
        return arrayMove(updatedTasks, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let newStatus = null;
    const isOverColumn = over.data.current?.type === "Column";
    const isOverTask = over.data.current?.type === "Task";

    if (isOverColumn) {
      newStatus = overId;
    } else if (isOverTask) {
      const overTask = tasks.find((t: any) => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    if (!newStatus) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", activeId);

      if (error) throw error;
      if (onTaskUpdated) onTaskUpdated();
    } catch (error: any) {
      toast.error("Erro ao sincronizar com o banco de dados.");
      console.error(error);
    }
  };

  return (
    <div className="flex h-full w-full overflow-x-auto p-4 custom-scrollbar bg-zinc-950/20">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 min-w-max pb-4">
          {COLUMNS.map((col: any) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasks.filter((t: any) => t.status === col.id)}
              profiles={profiles}
              onTaskUpdated={onTaskUpdated}
              onTaskDeleted={onTaskDeleted}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId && activeTask ? (
            <div className="opacity-90 rotate-2 scale-105 shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-grabbing ring-2 ring-indigo-500/50 rounded-lg">
              <KanbanTask task={activeTask} profiles={profiles} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}