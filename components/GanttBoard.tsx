"use client";

import { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr"; // ou o caminho do seu client Supabase

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
    // Para manter a simplicidade neste componente, usamos um prompt nativo.
    // Em uma versão futura, você pode abrir o TaskDetailsModal aqui.
    const newDueDateStr = window.prompt(
      `Alterar prazo para a tarefa: ${task.title}\nDigite a nova data (Formato: YYYY-MM-DD):`,
      task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : ""
    );

    if (!newDueDateStr) return;

    const newDueDate = new Date(newDueDateStr);
    if (isNaN(newDueDate.getTime())) {
      alert("Data inválida.");
      return;
    }

    // Atualização otimista na tela (fica rápido para o usuário)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, due_date: newDueDate.toISOString() } : t
      )
    );

    // Atualiza no banco de dados
    const { error } = await supabase
      .from("tasks")
      .update({ due_date: newDueDate.toISOString() })
      .eq("id", task.id);

    if (error) {
      console.error("Erro ao atualizar data:", error);
      alert("Erro ao salvar a nova data no banco de dados.");
      // Reverte o estado em caso de erro
      setTasks(initialTasks);
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <Calendar className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Cronograma</h3>
            <p className="text-sm text-zinc-400">Visão de 30 dias (clique na barra para alterar a data)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => shiftDays(-7)}
            className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button 
            onClick={() => shiftDays(7)}
            className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 w-full border border-zinc-800/80 rounded-lg overflow-x-auto bg-zinc-900/40 custom-scrollbar">
        <div className="min-w-[1200px]">
          {/* Cabeçalho de Datas */}
          <div className="flex border-b border-zinc-800/80 bg-zinc-900/80 text-xs text-zinc-400 sticky top-0 z-10">
            <div className="w-64 p-3 border-r border-zinc-800/80 flex-shrink-0 font-medium">Tarefa</div>
            <div className="flex-1 flex">
              {days.map((day, i) => (
                <div 
                  key={i} 
                  className={`flex-1 p-2 text-center border-r border-zinc-800/50 min-w-[40px] flex flex-col items-center justify-center ${
                    day.toDateString() === new Date().toDateString() ? "bg-indigo-500/10 text-indigo-300" : ""
                  }`}
                >
                  <span className="opacity-50 text-[10px] uppercase">{day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                  <span className="font-medium mt-1">{day.getDate()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Linhas das Tarefas */}
          <div className="divide-y divide-zinc-800/50">
            {tasks.map((task) => {
              // Lógica de cálculo de posição
              // Se a tarefa não tiver data de criação, assumimos a data atual
              const taskStart = task.created_at ? new Date(task.created_at) : new Date();
              // Se não tiver prazo, damos um prazo padrão de 3 dias para renderizar a barra
              const taskEnd = task.due_date ? new Date(task.due_date) : new Date(taskStart.getTime() + 3 * 24 * 60 * 60 * 1000);
              
              const totalDays = 30;
              const timelineStart = days[0].getTime();
              const timelineEnd = days[days.length - 1].getTime() + (24 * 60 * 60 * 1000); // Fim do último dia
              const timelineDuration = timelineEnd - timelineStart;

              // Calcula a porcentagem da esquerda e a largura
              let leftPercent = ((taskStart.getTime() - timelineStart) / timelineDuration) * 100;
              let widthPercent = ((taskEnd.getTime() - taskStart.getTime()) / timelineDuration) * 100;

              // Limitações visuais para não estourar a div
              if (leftPercent < 0) {
                widthPercent += leftPercent;
                leftPercent = 0;
              }
              if (leftPercent + widthPercent > 100) {
                widthPercent = 100 - leftPercent;
              }

              // Só renderiza a barra se ela estiver dentro da janela de 30 dias
              const isVisible = leftPercent < 100 && leftPercent + widthPercent > 0;

              return (
                <div key={task.id} className="flex text-sm text-zinc-300 hover:bg-zinc-800/20 transition-colors group">
                  <div className="w-64 p-3 border-r border-zinc-800/50 flex-shrink-0 truncate flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                    {task.title}
                  </div>
                  <div className="flex-1 relative p-1 bg-[url('/grid-pattern.svg')] bg-[length:40px_100%]">
                    {isVisible && (
                      <div 
                        onClick={() => handleBarClick(task)}
                        className="absolute top-2 bottom-2 rounded bg-indigo-500/20 border border-indigo-500/50 cursor-pointer hover:bg-indigo-500/40 hover:border-indigo-400 transition-all flex items-center justify-center overflow-hidden shadow-[0_0_10px_rgba(99,102,241,0.1)] group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                        style={{ 
                          left: `${Math.max(0, leftPercent)}%`, 
                          width: `${Math.max(2, widthPercent)}%` // largura mínima de 2% para ser clicável
                        }}
                      >
                        {widthPercent > 5 && (
                          <span className="text-[10px] font-medium text-indigo-200 truncate px-2">
                            {taskEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {tasks.length === 0 && (
              <div className="p-12 text-center text-zinc-500">
                Nenhuma tarefa disponível no cronograma.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}