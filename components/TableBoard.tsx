"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Calendar, Edit2, Clock } from "lucide-react";
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
        .select("*, profiles(full_name)")
        .single();

      if (error) throw error;

      onTaskUpdated(data);
      toast.success("Status atualizado com sucesso");
    } catch (error: any) {
      toast.error("Falha ao atualizar o status");
    }
  };

  // Cores de prioridade (agora combinando com o BD: low, medium, high, critical)
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

  return (
    <div className="h-full w-full overflow-auto custom-scrollbar">
      <table className="min-w-full divide-y divide-zinc-800">
        <thead className="bg-zinc-900/80 sticky top-0 z-10 backdrop-blur-sm">
          <tr>
            <th scope="col" className="py-4 pl-6 pr-3 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">
              Tarefa / Escopo
            </th>
            <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">
              Fase do Fluxo
            </th>
            <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">
              Prioridade
            </th>
            <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">
              Responsável Principal
            </th>
            <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">
              Prazo Final
            </th>
            <th scope="col" className="relative py-4 pl-3 pr-6">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50 bg-transparent">
          {tasks.map((task: any) => (
            <tr
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="hover:bg-zinc-900/50 transition-colors cursor-pointer group"
            >
              <td className="whitespace-nowrap py-4 pl-6 pr-3 sm:pl-6 max-w-[300px]">
                <div className="font-semibold text-white truncate">{task.title}</div>
                {task.description ? (
                  <div className="text-xs text-zinc-500 truncate mt-1">
                    {task.description}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-600 italic mt-1">Sem detalhes adicionais</div>
                )}
              </td>
              
              <td className="whitespace-nowrap px-3 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-3 pr-8 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                >
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
                      <span className="font-medium">{task.profiles.full_name?.split(' ')[0]}</span>
                    </>
                  ) : (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500">
                        <User size={12} />
                      </div>
                      <span className="italic text-xs text-zinc-600">Não Atribuído</span>
                    </>
                  )}
                </div>
              </td>
              
              <td className="whitespace-nowrap px-3 py-4 text-sm">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar className="h-4 w-4 text-zinc-500" />
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
          ))}
          {tasks.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="py-16 text-center text-sm text-zinc-500 border-b-0"
              >
                <Clock className="mx-auto h-8 w-8 text-zinc-700 mb-3" />
                Nenhuma tarefa operacional encontrada neste quadro.<br/>
                Mude para a visão Kanban e clique no '+' para adicionar a primeira.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Reaproveita o modal de detalhes rico que construímos antes */}
      {selectedTask && (
        <TaskDetailsModal 
          task={selectedTask} 
          onClose={() => {
            setSelectedTask(null);
            // Chama a atualização para refletir na tabela as horas ou mudanças do modal
            if(onTaskUpdated) onTaskUpdated();
          }} 
          onTaskUpdated={onTaskUpdated}
          onTaskDeleted={onTaskDeleted}
        />
      )}
    </div>
  );
}