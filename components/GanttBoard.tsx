"use client";

import { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Building2, User, AlertTriangle, Clock, AlertCircle } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr"; 
import { cn } from "@/utils/cn";

// Import the shared Task type
import { FullTaskData } from "./KanbanTask";

const STATUS_STYLES: Record<string, string> = {
  backlog: "bg-slate-50 text-slate-600 border-slate-200",
  todo: "bg-blue-50 text-blue-700 border-blue-200",
  "in-progress": "bg-amber-50 text-amber-700 border-amber-200",
  homologation: "bg-purple-50 text-purple-700 border-purple-200",
  production: "bg-indigo-50 text-indigo-700 border-indigo-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Triagem",
  todo: "A Fazer",
  "in-progress": "Execução",
  homologation: "Homologação",
  production: "Produção",
  done: "Concluído",
};

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
    <div className="flex h-full flex-col p-6 bg-white text-slate-900 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 shadow-sm">
            <Calendar className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Linha do Tempo Operacional</h3>
            <p className="text-sm text-slate-500">Gestão de prazos e carga de trabalho em tempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => shiftDays(-7)}
            className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 hover:text-slate-900 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <div className="w-px h-4 bg-slate-200"></div>
          <button 
            onClick={() => shiftDays(7)}
            className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 hover:text-slate-900 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 w-full border border-slate-200 rounded-2xl overflow-x-auto bg-slate-50/50 custom-scrollbar shadow-sm relative">
        <div className="min-w-[1400px] h-full flex flex-col">

          {/* Cabeçalho de Datas */}
          <div className="flex border-b border-slate-200 bg-white/80 text-xs text-slate-500 sticky top-0 z-30 backdrop-blur-md">
            <div className="w-80 p-4 border-r border-slate-200 flex-shrink-0 font-bold uppercase tracking-widest flex items-center justify-between bg-white">
              <span>Atividade & Cliente</span>
              <Clock size={14} className="text-slate-300" />
            </div>
            <div className="flex-1 flex">
              {days.map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div key={i} className={cn(
                    "flex-1 p-2 text-center border-r border-slate-100 min-w-[46px] flex flex-col items-center justify-center transition-colors",
                    isToday ? "bg-indigo-50 text-indigo-600" : isWeekend ? "bg-slate-100 text-slate-400" : ""
                  )}>
                    <span className="text-[9px] uppercase font-black tracking-tighter">{day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                    <span className={`font-bold mt-1 text-sm ${isToday ? "text-indigo-600" : ""}`}>{day.getDate()}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Linhas das Tarefas */}
          <div className="flex-1 divide-y divide-slate-100 pb-20 relative">
            {/* LINHA VERTICAL DE "HOJE" (MÁGICA DE SENIOR) */}
            {(() => {
              const today = new Date();
              const timelineStart = days[0].getTime();
              const timelineEnd = days[days.length - 1].getTime() + (24 * 60 * 60 * 1000);
              if (today.getTime() >= timelineStart && today.getTime() <= timelineEnd) {
                const left = ((today.getTime() - timelineStart) / (timelineEnd - timelineStart)) * 100;
                return (
                  <div 
                    className="absolute top-0 bottom-0 w-px bg-indigo-400 z-20 pointer-events-none"
                    style={{ left: `calc(320px + (100% - 320px) * ${left / 100})` }}
                  >
                    <div className="bg-indigo-600 text-[8px] font-bold text-white px-1 rounded-sm absolute -top-1 -translate-x-1/2 uppercase">Hoje</div>
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
              let barColor = "bg-white border-slate-200 hover:border-indigo-300";
              let progressColor = "bg-indigo-100";
              let textColor = "text-indigo-700";
              if (isCompleted) {
                barColor = "bg-emerald-50 border-emerald-200";
                progressColor = "bg-emerald-100";
                textColor = "text-emerald-700";
              } else if (task.is_blocked) {
                barColor = "bg-red-50 border-red-200";
                progressColor = "bg-red-100";
                textColor = "text-red-700";
              }

              return (
                <div key={task.id} className="flex text-sm text-slate-700 hover:bg-slate-50 transition-colors group h-14">
                  {/* Coluna Esquerda: Escopo e Cliente */}
                  <div className="w-80 p-3 border-r border-slate-100 flex-shrink-0 flex flex-col justify-center gap-0.5 bg-white sticky left-0 z-10 shadow-sm">
                    <div className="flex items-center gap-2 truncate">
                      {task.is_blocked && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                      {!task.is_blocked && isCompleted && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                      {!task.is_blocked && !isCompleted && <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
                      <span className={cn(
                        "font-bold text-xs truncate transition-colors",
                        isCompleted ? "text-slate-400 line-through" : "text-slate-900"
                      )}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pl-4">
                      {task.clients?.name ? (
                        <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1 truncate uppercase tracking-tighter">
                          <Building2 size={10} /> {task.clients.name}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-300 flex items-center gap-1.5 italic">
                          Interno
                        </div>
                      )}
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
                        STATUS_STYLES[task.status] || "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {STATUS_LABELS[task.status] || task.status}
                      </span>
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
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-700 border border-slate-200 shadow-sm" 
                                title={task.profiles.full_name || undefined}
                              >
                                {task.profiles.full_name?.charAt(0)}
                              </div>
                            ) : (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-300">
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
              <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                <Calendar className="h-10 w-10 text-slate-200 mb-3" />
                <p>Nenhuma tarefa agendada neste quadro.</p>
                <p className="text-xs text-slate-300 mt-1">Defina a "Data de Início" e o "Prazo Final" nas tarefas para elas aparecerem aqui.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}