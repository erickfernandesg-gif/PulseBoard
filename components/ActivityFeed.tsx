"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Activity, ArrowRight, Loader2 } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertOctagon, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";

export function ActivityFeed({ boardId }: { boardId?: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const isManager = profile?.role === "admin" || profile?.role === "manager";

      let query = supabase
        .from("activity_log")
        .select("*, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(10);

      if (boardId) query = query.eq("board_id", boardId);

      // Lógica Sênior: Se não for gestor, filtra apenas o que lhe diz respeito
      if (!isManager) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setLogs(data);
      }
      setIsLoading(false);
    }

    fetchLogs();

    // Opcional: Subscrever alterações em tempo real para o feed atualizar sozinho
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, () => {
        fetchLogs(); // Atualiza a lista quando há um log novo
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, supabase]);

  // Agrupar logs por data para melhor escaneabilidade
  const groupedLogs = logs.reduce((acc: any, log: any) => {
    const date = new Date(log.created_at);
    let label = format(date, "dd 'de' MMMM", { locale: ptBR });
    
    if (isToday(date)) label = "Hoje";
    else if (isYesterday(date)) label = "Ontem";

    if (!acc[label]) acc[label] = [];
    acc[label].push(log);
    return acc;
  }, {});

  // Função para traduzir a "Ação" da base de dados para texto humano
  const renderLogAction = (log: any) => {
    const userName = log.profiles?.full_name?.split(" ")[0] || "Alguém";
    const details = log.details || {};

    switch (log.action) {
      case "status_changed":
        return (
          <span className="text-slate-500">
            <span className="font-bold text-slate-900">{userName}</span> moveu a tarefa <span className="font-semibold text-indigo-600">"{details.task_title}"</span> de <span className="text-slate-400 line-through">{details.old_status}</span> para <span className="text-emerald-700 font-bold">{details.new_status}</span>
          </span>
        );
      case "task_blocked":
        return (
          <span className="text-red-700">
            <span className="font-bold text-slate-900">{userName}</span> <strong>BLOQUEOU</strong> a tarefa <span className="font-semibold">"{details.task_title}"</span>: <span className="italic">"{details.reason}"</span>
          </span>
        );
      case "task_unblocked":
        return (
          <span className="text-emerald-700">
            <span className="font-bold text-slate-900">{userName}</span> desbloqueou a tarefa <span className="font-semibold">"{details.task_title}"</span>.
          </span>
        );
      case "automation_fired":
        return (
          <span className="text-indigo-700">
            <span className="font-bold text-slate-900">🤖 PulseBot</span> executou: <span className="italic">"{details.automation_title}"</span> na tarefa <span className="font-semibold text-slate-700">"{details.task_title}"</span>
          </span>
        );
      default:
        return <span><span className="font-bold text-slate-900">{userName}</span> realizou uma ação.</span>;
    }
  };

  const getIcon = (action: string) => {
    if (action === "task_blocked") return <AlertOctagon size={12} className="text-red-500" />;
    if (action === "task_unblocked") return <CheckCircle2 size={12} className="text-emerald-500" />;
    return <Activity size={12} className="text-slate-400" />;
  };

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-indigo-600" size={20} /></div>;
  }

  if (logs.length === 0) {
    return <p className="text-xs text-slate-500 italic p-4">Nenhuma atividade registrada ainda.</p>;
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedLogs).map(([dateLabel, dayLogs]: [string, any]) => (
        <div key={dateLabel} className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">{dateLabel}</span>
            <div className="h-px w-full bg-slate-200"></div>
          </div>
          {dayLogs.map((log: any) => (
            <div key={log.id} className="flex gap-3 text-sm group">
              <div className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                log.action === "task_blocked" ? "bg-red-50 border-red-100" : "bg-white border-slate-200 group-hover:border-slate-300 shadow-sm"
              )}>
                {getIcon(log.action)}
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="leading-snug">
                  {renderLogAction(log)}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {format(new Date(log.created_at), "HH:mm")} • {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}