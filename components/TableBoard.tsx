"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Calendar, Edit2, Clock, Building2, Timer, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { TaskDetailsModal } from "./TaskDetailsModal";

export function TableBoard({
  tasks,
  setTasks,
  profiles,
  onTaskUpdated,
  onTaskDeleted,
}: any) {
  const supabase = createClient();
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId)
        .select("*, profiles(full_name), clients(name)")
        .single();

      if (error) throw error;

      onTaskUpdated(data);
      toast.success("Status atualizado com sucesso");
    } catch (error: any) {
      toast.error("Falha ao atualizar o status");
    }
  };

  // Cores de prioridade 
  const priorityColors: Record<string, string> = {
    low: "bg-zinc-800 text-zinc-300 border-zinc-700",
    medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    critical: "bg-red-500/10 text-red-400 border-red-500/30 font-bold",
  };

  const priorityLabels: Record<string, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    critical: "Crítica",
  };

  // Formatação de Tempo (h m)
  const formatTime = (totalMinutes: number) => {
    if (!totalMinutes) return "0h";
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="h-full w-full overflow-auto custom-scrollbar pb-20">
      <table className="min-w-full divide-y divide-zinc-800 border-b border-zinc-800/50">
        <thead className="bg-zinc-900/90 sticky top-0 z-10 backdrop-blur-md shadow-sm">
          <tr>
            <th scope="col" className="py-4 pl-6 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Tarefa / Escopo
            </th>
            <th scope="col" className="px-3 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Cliente
            </th>
            <th scope="col" className="px-3 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Fase do Fluxo
            </th>
            <th scope="col" className="px-3 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Prioridade
            </th>
            <th scope="col" className="px-3 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Responsável Principal
            </th>
            <th scope="col" className="px-3 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Orçamento de Tempo
            </th>
            <th scope="col" className="px-3 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Prazo Final
            </th>
            <th scope="col" className="relative py-4 pl-3 pr-6">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50 bg-transparent">
          {tasks.map((task: any) => {
            const est = task.estimated_minutes || 0;
            const spent = task.total_minutes_spent || 0;
            const hasEstimates = est > 0;
            const percentage = hasEstimates ? Math.min((spent / est) * 100, 100) : 0;
            const isOverBudget = hasEstimates && spent > est;

            return (
              <tr
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="hover:bg-zinc-900/50 transition-colors cursor-pointer group"
              >
                <td className="whitespace-nowrap py-4 pl-6 pr-3 sm:pl-6 max-w-[280px]">
                  <div className="font-semibold text-white truncate flex items-center gap-2">
                    {task.is_blocked && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                    {task.title}
                  </div>
                  {task.description ? (
                    <div className="text-[11px] text-zinc-500 truncate mt-1">
                      {task.description}
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-600 italic mt-1">Sem detalhes adicionais</div>
                  )}
                </td>

                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  {task.clients?.name ? (
                    <div className="flex items-center gap-1.5 text-indigo-300 font-medium text-xs bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20 inline-flex">
                      <Building2 size={12} />
                      {task.clients.name}
                    </div>
                  ) : (
                    <span className="text-zinc-500 text-xs italic bg-zinc-800/50 px-2 py-1 rounded-md inline-block">Interno</span>
                  )}
                </td>
                
                <td className="whitespace-nowrap px-3 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-3 pr-8 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="backlog">Caixa de Entrada</option>
                    <option value="todo">A Fazer (Backlog)</option>
                    <option value="in-progress">Em Execução</option>
                    <option value="homologation">Homologação / Testes</option>
                    <option value="production">Produção</option>
                    <option value="done">✅ Concluído</option>
                  </select>
                </td>
                
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                      priorityColors[task.priority || 'medium']
                    )}
                  >
                    {priorityLabels[task.priority || 'medium']}
                  </span>
                </td>
                
                <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    {task.assigned_to && task.profiles ? (
                      <>
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white uppercase shadow-sm">
                          {task.profiles.full_name?.charAt(0) || <User size={12} />}
                        </div>
                        <span className="font-medium text-xs text-zinc-300">{task.profiles.full_name?.split(' ')[0]}</span>
                      </>
                    ) : (
                      <>
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500">
                          <User size={12} />
                        </div>
                        <span className="italic text-[11px] text-zinc-600">Não Atribuído</span>
                      </>
                    )}
                  </div>
                </td>

                <td className="whitespace-nowrap px-3 py-4 text-sm w-[200px]">
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className={cn(isOverBudget ? "text-red-400" : "text-zinc-400")}>
                        {formatTime(spent)} gasto
                      </span>
                      {hasEstimates && (
                        <span className="text-zinc-500">/ {formatTime(est)} prev.</span>
                      )}
                    </div>
                    {hasEstimates ? (
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                        <div 
                          className={cn("h-full transition-all duration-500", isOverBudget ? "bg-red-500" : "bg-emerald-500")}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    ) : (
                      <div className="h-1.5 w-full bg-zinc-800/50 rounded-full border border-dashed border-zinc-700 flex items-center justify-center">
                        {spent > 0 && <div className="h-full bg-zinc-600 w-full" />}
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                    {task.due_date ? (
                      <span className="text-xs font-medium">
                        {format(new Date(task.due_date), "dd/MM/yyyy")}
                      </span>
                    ) : (
                      <span className="text-xs italic text-zinc-600">Sem data</span>
                    )}
                  </div>
                </td>
                
                <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => setSelectedTask(task)}
                    className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
          {tasks.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="py-20 text-center text-sm text-zinc-500 border-b-0"
              >
                <Timer className="mx-auto h-10 w-10 text-zinc-800 mb-4" />
                Nenhuma tarefa operacional encontrada.<br/>
                Clique em "Nova Demanda" para iniciar o planejamento.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {selectedTask && (
        <TaskDetailsModal 
          task={selectedTask} 
          onClose={() => {
            setSelectedTask(null);
            if(onTaskUpdated) onTaskUpdated();
          }} 
          onTaskUpdated={onTaskUpdated}
          onTaskDeleted={onTaskDeleted}
        />
      )}
    </div>
  );
}