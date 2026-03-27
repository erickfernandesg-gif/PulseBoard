"use client";

import { Draggable } from "@hello-pangea/dnd";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, User, ChevronLeft, ChevronRight, Loader2, AlertOctagon, Building2, Timer } from "lucide-react";
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

// Define nested types for joined data
interface JoinedTaskProfile {
  full_name: string | null;
  avatar_url: string | null;
}

interface JoinedTaskClient {
  name: string | null;
}

// Define the main Task interface for KanbanTask and other components receiving joined task data
export interface FullTaskData { // Exported for use in other components like BoardClient, KanbanBoard, GanttBoard
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: "low" | "medium" | "high" | "urgent" | "critical"; // Enforce known priorities
  is_blocked: boolean;
  blocker_reason: string | null;
  estimated_minutes: number | null;
  total_minutes_spent: number | null;
  start_date: string | null;
  due_date: string | null;
  client_id: string | null;
  assigned_to: string | null;
  target_month: string | null;
  created_at: string; // Assuming created_at is always present in fetched tasks
  profiles: JoinedTaskProfile | null; // Profile of assigned_to
  clients: JoinedTaskClient | null;
}

export function KanbanTask({ task, index, onTaskUpdated, onTaskDeleted }: { task: FullTaskData; index: number; onTaskUpdated?: () => void; onTaskDeleted?: (taskId: string) => void; }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const supabase = createClient();

  const priorityColors: Record<string, string> = {
    low: "bg-zinc-800 text-zinc-300 border-zinc-700",
    medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    urgent: "bg-purple-500/10 text-purple-400 border-purple-500/20", // Adicionado para consistência
    critical: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    urgent: "Urgente", // Adicionado para consistência
    critical: "Crítica",
  };

  // Lógica de progresso de tempo (Senior BI Insight)
  const est = task.estimated_minutes || 0;
  const spent = task.total_minutes_spent || 0;
  const hasEstimates = est > 0;
  const percentage = hasEstimates ? Math.min((spent / est) * 100, 100) : 0;
  const isOverBudget = hasEstimates && spent > est;

  // Formatação simplificada para o card
  const formatMins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h` : `${m}m`);

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
              "group flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-all relative overflow-hidden",
              snapshot.isDragging 
                ? "border-indigo-500 shadow-2xl z-50 ring-2 ring-indigo-500/20 bg-zinc-900 opacity-95" 
                : task.is_blocked
                  ? "border-red-500/50 bg-[#1a0f0f] hover:border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.1)] bg-[url('/diagonal-stripes.svg')]" // Visual de Impedimento
                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
            )}
            style={{
              ...provided.draggableProps.style,
            }}
          >
            {/* Faixa lateral de bloqueio (Visual Indicativo Animado) */}
            {task.is_blocked && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse" />
            )}

            {/* Cabeçalho do Card: Prioridade + Setinhas de Mover */}
            <div className="flex items-start justify-between gap-2 relative z-10">
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                  priorityColors[task.priority || "medium"]
                )}
              >
                {priorityLabels[task.priority || "medium"]}
              </span>
              
              {/* === OS BOTÕES DE SETA (Mover Fácil) === */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <div onClick={() => setIsModalOpen(true)} className="cursor-pointer group-hover:text-indigo-100 relative z-10">
              <div className="flex flex-col gap-1">
                {task.clients?.name && (
                  <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-400 uppercase tracking-tighter mb-1 truncate">
                    <Building2 size={10} /> {task.clients.name}
                  </div>
                )}
                <h4 className="font-semibold text-white text-sm transition-colors leading-tight">{task.title}</h4>
              </div>
              
              {/* Barra de Progresso de Tempo (Micro-dashboard) */}
              {spent > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-tighter">
                    <span className={isOverBudget ? "text-red-400" : "text-zinc-500"}>
                      {formatMins(spent)} consumidos
                    </span>
                    {hasEstimates && <span className="text-zinc-600">Alvo: {formatMins(est)}</span>}
                  </div>
                  <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500", isOverBudget ? "bg-red-500" : "bg-emerald-500")}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* ALERTA DE BLOQUEIO OU DESCRIÇÃO */}
              {task.is_blocked ? (
                <div className="mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                  <AlertOctagon size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold uppercase text-[9px] text-red-500 tracking-wider block mb-0.5">Impedimento Ativo</span>
                    <p className="text-xs text-red-200 font-medium leading-tight line-clamp-2">
                      {task.blocker_reason || "Bloqueada sem motivo detalhado."}
                    </p>
                  </div>
                </div>
              ) : (
                task.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-zinc-500 leading-relaxed">
                    {task.description}
                  </p>
                )
              )}
            </div>

            {/* Rodapé (Clicável para abrir Detalhes) */}
            <div 
              className="mt-2 flex items-center justify-between border-t border-zinc-800/50 pt-3 cursor-pointer relative z-10"
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
                    title={task.profiles?.full_name || "Usuário Atribuído"} // Fallback for title
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