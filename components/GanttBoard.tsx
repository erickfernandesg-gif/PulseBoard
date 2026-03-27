"use client";

import { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Building2, User, AlertTriangle, Clock } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr"; 

export function GanttBoard({ tasks: initialTasks }: { tasks: any[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [startDate, setStartDate] = useState(() => {
    // Inicia o calendário 5 dias antes da data atual para dar contexto
    const date = new Date();
    date.setDate(date.getDate() - 5);
    return date;
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Gera um array com 30 dias a partir da data inicial
  const days = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [startDate]);

  const handleBarClick = async (task: any) => {
    const newDueDateStr = window.prompt(
      `REPLANEJAMENTO DE PRAZO\nAlterar prazo final da tarefa: "${task.title}"\nDigite a nova data (Formato: YYYY-MM-DD):`,
      task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : ""
    );

    if (!newDueDateStr) return;

    const newDueDate = new Date(newDueDateStr);
    if (isNaN(newDueDate.getTime())) {
      alert("Data inválida. Use o formato YYYY-MM-DD.");
      return;
    }

    // Atualização otimista (Fricção Zero para o usuário)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, due_date: newDueDate.toISOString() } : t
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({ due_date: newDueDate.toISOString() })
      .eq("id", task.id);

    if (error) {
      console.error("Erro ao atualizar data:", error);
      alert("Erro ao salvar o replanejamento no banco de dados.");
      setTasks(initialTasks); // Reverte o estado
    }
  };

  const shiftDays = (daysToShift: number) => {
    setStartDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + daysToShift);
      return newDate;
    });
  };

  return (
    <div className="flex h-full flex-col p-6 bg-zinc-950 text-zinc-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <Calendar className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Cronograma e Alocação</h3>
            <p className="text-sm text-zinc-400">Visão de capacidade da equipe (clique na barra para estender prazos)</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800">
          <button 
            onClick={() => shiftDays(-7)}
            className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <div className="w-px h-4 bg-zinc-700"></div>
          <button 
            onClick={() => shiftDays(7)}
            className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 w-full border border-zinc-800/80 rounded-xl overflow-x-auto bg-zinc-900/40 custom-scrollbar shadow-lg">
        <div className="min-w-[1200px]">
          
          {/* Cabeçalho de Datas */}
          <div className="flex border-b border-zinc-800/80 bg-zinc-900/90 text-xs text-zinc-400 sticky top-0 z-10 backdrop-blur-md">
            <div className="w-72 p-4 border-r border-zinc-800/80 flex-shrink-0 font-bold uppercase tracking-widest flex items-center justify-between">
              <span>Atividade & Cliente</span>
              <Clock size={14} className="text-zinc-600" />
            </div>
            <div className="flex-1 flex">
              {days.map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div 
                    key={i} 
                    className={`flex-1 p-2 text-center border-r border-zinc-800/50 min-w-[40px] flex flex-col items-center justify-center ${
                      isToday ? "bg-indigo-500/10 text-indigo-300 shadow-[inset_0_-2px_0_rgba(99,102,241,0.5)]" : isWeekend ? "bg-zinc-900/30 text-zinc-600" : ""
                    }`}
                  >
                    <span className="opacity-60 text-[9px] uppercase font-bold tracking-widest">{day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                    <span className={`font-bold mt-1 text-sm ${isToday ? "text-indigo-400" : ""}`}>{day.getDate()}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Linhas das Tarefas */}
          <div className="divide-y divide-zinc-800/50 pb-10">
            {tasks.map((task) => {
              // INTELIGÊNCIA DE DATAS
              const taskStart = task.start_date ? new Date(task.start_date) : (task.created_at ? new Date(task.created_at) : new Date());
              const taskEnd = task.due_date ? new Date(task.due_date) : new Date(taskStart.getTime() + 3 * 24 * 60 * 60 * 1000); // Default 3 dias
              
              const timelineStart = days[0].getTime();
              const timelineEnd = days[days.length - 1].getTime() + (24 * 60 * 60 * 1000); 
              const timelineDuration = timelineEnd - timelineStart;

              let leftPercent = ((taskStart.getTime() - timelineStart) / timelineDuration) * 100;
              let widthPercent = ((taskEnd.getTime() - taskStart.getTime()) / timelineDuration) * 100;

              // Correção visual para barras que cortam a tela
              if (leftPercent < 0) {
                widthPercent += leftPercent;
                leftPercent = 0;
              }
              if (leftPercent + widthPercent > 100) {
                widthPercent = 100 - leftPercent;
              }

              const isVisible = leftPercent < 100 && leftPercent + widthPercent > 0;
              const isCompleted = task.status === 'done' || task.status === 'Feito' || task.status === 'concluído';

              // Cores Dinâmicas da Barra
              let barColor = "bg-indigo-500/20 border-indigo-500/50 hover:bg-indigo-500/40";
              let textColor = "text-indigo-200";
              if (isCompleted) {
                barColor = "bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/40";
                textColor = "text-emerald-200";
              } else if (task.is_blocked) {
                barColor = "bg-red-500/20 border-red-500/50 hover:bg-red-500/40 bg-[url('/diagonal-stripes.svg')]"; // Se você não tiver o SVG, fica só vermelho
                textColor = "text-red-200";
              }

              return (
                <div key={task.id} className="flex text-sm text-zinc-300 hover:bg-zinc-800/20 transition-colors group">
                  {/* Coluna Esquerda: Escopo e Cliente */}
                  <div className="w-72 p-3 border-r border-zinc-800/50 flex-shrink-0 flex flex-col justify-center gap-1 bg-zinc-950/30">
                    <div className="flex items-center gap-2 truncate">
                      {task.is_blocked && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                      {!task.is_blocked && isCompleted && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                      {!task.is_blocked && !isCompleted && <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                      <span className="font-semibold text-white truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center justify-between pl-4">
                      {task.clients?.name ? (
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 truncate">
                          <Building2 size={10} className="text-indigo-400" /> {task.clients.name}
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-600 flex items-center gap-1.5 italic">
                          Interno
                        </div>
                      )}
                      {task.estimated_minutes > 0 && (
                        <span className="text-[9px] font-bold text-amber-500/70">{Math.floor(task.estimated_minutes / 60)}h</span>
                      )}
                    </div>
                  </div>

                  {/* Linha do Tempo e Barras */}
                  <div className="flex-1 relative p-1.5 bg-[url('/grid-pattern.svg')] bg-[length:40px_100%]">
                    {isVisible && (
                      <div 
                        onClick={() => handleBarClick(task)}
                        className={`absolute top-2.5 bottom-2.5 rounded-md border cursor-pointer transition-all flex items-center justify-between px-2 overflow-hidden shadow-sm group-hover:shadow-md ${barColor}`}
                        style={{ 
                          left: `${Math.max(0, leftPercent)}%`, 
                          width: `${Math.max(3, widthPercent)}%` 
                        }}
                        title={`Data Prevista: ${taskEnd.toLocaleDateString('pt-BR')}`}
                      >
                        {widthPercent > 6 && (
                          <span className={`text-[10px] font-bold tracking-widest truncate ${textColor}`}>
                            {taskStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {taskEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                        
                        {/* Avatar do Responsável na Barra */}
                        {widthPercent > 10 && (
                          <div className="flex -space-x-1.5 shrink-0 ml-2">
                            {task.profiles ? (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-bold text-white border border-zinc-600 shadow-sm" title={task.profiles.full_name}>
                                {task.profiles.full_name?.charAt(0)}
                              </div>
                            ) : (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500">
                                <User size={10} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {tasks.length === 0 && (
              <div className="p-16 text-center text-zinc-500 flex flex-col items-center">
                <Calendar className="h-10 w-10 text-zinc-800 mb-3" />
                <p>Nenhuma tarefa agendada neste quadro.</p>
                <p className="text-xs text-zinc-600 mt-1">Defina a "Data de Início" e o "Prazo Final" nas tarefas para elas aparecerem aqui.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}