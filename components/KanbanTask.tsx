"use client";

import { Draggable } from "@hello-pangea/dnd";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, User, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { TaskDetailsModal } from "./TaskDetailsModal";
import { cn } from "@/utils/cn";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

// A ordem exata das suas colunas
const STATUS_ORDER = [
  "backlog",
  "todo",
  "in-progress",
  "homologation",
  "production",
  "done"
];

export function KanbanTask({ task, index, onTaskUpdated, onTaskDeleted }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const supabase = createClient();

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

  // Descobre onde o card está agora
  const currentStatusIndex = STATUS_ORDER.indexOf(task.status || "todo");
  const canMoveLeft = currentStatusIndex > 0;
  const canMoveRight = currentStatusIndex < STATUS_ORDER.length - 1;

  // Função para mover a tarefa via clique
  const handleMove = async (direction: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que o clique abra o modal da tarefa
    if (isMoving) return;

    const newIndex = direction === "left" ? currentStatusIndex - 1 : currentStatusIndex + 1;
    const newStatus = STATUS_ORDER[newIndex];

    setIsMoving(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);

      if (error) throw error;
      
      // Atualiza o quadro imediatamente
      if (onTaskUpdated) onTaskUpdated();
    } catch (error) {
      toast.error("Erro ao mover a tarefa.");
      console.error(error);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <>
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "group flex flex-col gap-3 rounded-xl border bg-zinc-950 p-4 shadow-sm transition-colors relative",
              snapshot.isDragging 
                ? "border-indigo-500 shadow-2xl z-50 ring-2 ring-indigo-500/20 bg-zinc-900 opacity-95" 
                : "border-zinc-800 hover:border-zinc-700"
            )}
            style={{
              ...provided.draggableProps.style,
            }}
          >
            {/* Cabeçalho do Card: Prioridade + Setinhas de Mover */}
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                  priorityColors[task.priority || "medium"]
                )}
              >
                {priorityLabels[task.priority || "medium"]}
              </span>
              
              {/* === OS BOTÕES DE SETA (Mover Fácil) === */}
              <div className="flex items-center gap-1">
                {isMoving && <Loader2 size={12} className="animate-spin text-indigo-500 mr-1" />}
                
                {canMoveLeft && (
                  <button
                    onClick={(e) => handleMove("left", e)}
                    disabled={isMoving}
                    className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-colors disabled:opacity-50"
                    title="Voltar etapa"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                
                {canMoveRight && (
                  <button
                    onClick={(e) => handleMove("right", e)}
                    disabled={isMoving}
                    className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-colors disabled:opacity-50"
                    title="Avançar etapa"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Corpo do Card (Clicável para abrir Detalhes) */}
            <div onClick={() => setIsModalOpen(true)} className="cursor-pointer group-hover:text-indigo-100">
              <h4 className="font-semibold text-white text-sm transition-colors leading-tight">{task.title}</h4>
              {task.description && (
                <p className="mt-2 line-clamp-2 text-xs text-zinc-500 leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>

            {/* Rodapé (Clicável para abrir Detalhes) */}
            <div 
              className="mt-2 flex items-center justify-between border-t border-zinc-800/50 pt-3 cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            >
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