"use client";

import { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Building2, User, AlertTriangle, Clock, AlertCircle } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr"; 
import { cn } from "@/utils/cn";

// Import the shared Task type
import { FullTaskData } from "./KanbanTask";

export function GanttBoard({ tasks: initialTasks }: { tasks: FullTaskData[] }) {
  const [tasks, setTasks] = useState<FullTaskData[]>(initialTasks);
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

  // Formatação de Tempo (h m)
  const formatMins = (m: number) => {
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  };

  // Gera um array com 30 dias a partir da data inicial
  const days = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [startDate]);

  const handleBarClick = async (task: FullTaskData) => {
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
    <div className="flex h-full flex-col p-6 bg-zinc-950 text-zinc-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 shadow-lg">
            <Calendar className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Linha do Tempo Operacional</h3>
            <p className="text-sm text-zinc-500">Gestão de prazos e carga de trabalho em tempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/40 p-1.5 rounded-xl border border-zinc-800/50 backdrop-blur-md">
          <button 
            onClick={() => shiftDays(-7)}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <div className="w-px h-4 bg-zinc-700"></div>
          <button 
            onClick={() => shiftDays(7)}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 w-full border border-zinc-800/80 rounded-2xl overflow-x-auto bg-zinc-900/20 custom-scrollbar shadow-2xl relative">
        <div className="min-w-[1400px] h-full flex flex-col">
          
          {/* Cabeçalho de Datas */}
          <div className="flex border-b border-zinc-800/80 bg-zinc-950/80 text-xs text-zinc-400 sticky top-0 z-30 backdrop-blur-xl">
            <div className="w-80 p-4 border-r border-zinc-800/80 flex-shrink-0 font-bold uppercase tracking-widest flex items-center justify-between bg-zinc-950">
              <span>Atividade & Cliente</span>
              <Clock size={14} className="text-zinc-600" />
            </div>
            <div className="flex-1 flex">
              {days.map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div key={i} className={cn(
                    "flex-1 p-2 text-center border-r border-zinc-800/30 min-w-[46px] flex flex-col items-center justify-center transition-colors",
                    isToday ? "bg-indigo-500/5 text-indigo-400" : isWeekend ? "bg-zinc-900/40 text-zinc-600" : ""
                  )}>
                    <span className="text-[9px] uppercase font-black tracking-tighter">{day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                    <span className={`font-bold mt-1 text-sm ${isToday ? "text-indigo-400" : ""}`}>{day.getDate()}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Linhas das Tarefas */}
          <div className="flex-1 divide-y divide-zinc-800/50 pb-20 relative">
            {/* LINHA VERTICAL DE "HOJE" (MÁGICA DE SENIOR) */}
            {(() => {
              const today = new Date();
              const timelineStart = days[0].getTime();
              const timelineEnd = days[days.length - 1].getTime() + (24 * 60 * 60 * 1000);
              if (today.getTime() >= timelineStart && today.getTime() <= timelineEnd) {
                const left = ((today.getTime() - timelineStart) / (timelineEnd - timelineStart)) * 100;
                return (
                  <div 
                    className="absolute top-0 bottom-0 w-px bg-indigo-500/50 z-20 pointer-events-none"
                    style={{ left: `calc(320px + (100% - 320px) * ${left / 100})` }}
                  >
                    <div className="bg-indigo-500 text-[8px] font-bold text-white px-1 rounded-sm absolute -top-1 -translate-x-1/2 uppercase">Hoje</div>
                  </div>
                );
              }
            })()}

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

              // CÁLCULO DE PROGRESSO (SENIOR BI)
              const est = task.estimated_minutes || 0;
              const spent = task.total_minutes_spent || 0;
              const progressPercent = est > 0 ? Math.min((spent / est) * 100, 100) : 0;

              // Cores Dinâmicas da Barra
              let barColor = "bg-zinc-900 border-zinc-700 hover:border-indigo-500/50";
              let progressColor = "bg-indigo-500/20";
              let textColor = "text-indigo-200";
              if (isCompleted) {
                barColor = "bg-emerald-950/20 border-emerald-500/30";
                progressColor = "bg-emerald-500/30";
                textColor = "text-emerald-200";
              } else if (task.is_blocked) {
                barColor = "bg-red-950/20 border-red-500/30";
                progressColor = "bg-red-500/20";
                textColor = "text-red-200";
              }

              return (
                <div key={task.id} className="flex text-sm text-zinc-300 hover:bg-white/[0.02] transition-colors group h-14">
                  {/* Coluna Esquerda: Escopo e Cliente */}
                  <div className="w-80 p-3 border-r border-zinc-800/50 flex-shrink-0 flex flex-col justify-center gap-0.5 bg-zinc-950 sticky left-0 z-10 shadow-xl">
                    <div className="flex items-center gap-2 truncate">
                      {task.is_blocked && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                      {!task.is_blocked && isCompleted && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                      {!task.is_blocked && !isCompleted && <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                      <span className={cn(
                        "font-bold text-xs truncate transition-colors",
                        isCompleted ? "text-zinc-500 line-through" : "text-zinc-100"
                      )}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pl-4">
                      {task.clients?.name ? (
                        <div className="text-[9px] font-bold text-zinc-600 flex items-center gap-1 truncate uppercase tracking-tighter">
                          <Building2 size={10} /> {task.clients.name}
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-600 flex items-center gap-1.5 italic">
                          Interno
                        </div>
                      )}
                      <span className="text-[9px] font-black text-zinc-700 bg-zinc-900 px-1.5 rounded uppercase">{task.status}</span>
                    </div>
                  </div>

                  {/* Linha do Tempo e Barras */}
                  <div className="flex-1 relative p-2">
                    {isVisible && (
                      <div 
                        onClick={() => handleBarClick(task)}
                        className={cn(
                          "absolute top-3 bottom-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between px-3 overflow-hidden shadow-sm hover:shadow-indigo-500/10 hover:scale-[1.01]",
                          barColor
                        )}
                        style={{ 
                          left: `${Math.max(0, leftPercent)}%`, 
                          width: `${Math.max(3, widthPercent)}%` 
                        }}
                        title={`Data Prevista: ${taskEnd.toLocaleDateString('pt-BR')}`}
                      >
                        {/* INDICADOR DE PROGRESSO INTERNO */}
                        <div 
                          className={cn("absolute inset-y-0 left-0 transition-all duration-1000", progressColor)}
                          style={{ width: `${progressPercent}%` }}
                        />

                        {widthPercent > 6 && (
                          <span className={cn("text-[9px] font-black tracking-widest truncate relative z-10 uppercase", textColor)}>
                            {formatMins(spent)} / {formatMins(est)}
                          </span>
                        )}
                        
                        {/* Avatar do Responsável na Barra */}
                        {widthPercent > 10 && (
                          <div className="flex -space-x-1.5 shrink-0 ml-2">
                            {task.profiles ? (
                              <div 
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-bold text-white border border-zinc-600 shadow-sm" 
                                title={task.profiles.full_name || undefined}
                              >
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