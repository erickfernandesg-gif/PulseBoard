"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Activity, ArrowRight, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertOctagon, CheckCircle2 } from "lucide-react";

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

  // Função para traduzir a "Ação" da base de dados para texto humano
  const renderLogAction = (log: any) => {
    const userName = log.profiles?.full_name?.split(" ")[0] || "Alguém";
    const details = log.details || {};

    switch (log.action) {
      case "status_changed":
        return (
          <span>
            <span className="font-bold text-white">{userName}</span> moveu a tarefa <span className="font-semibold text-indigo-400">"{details.task_title}"</span> de <span className="text-zinc-500 line-through">{details.old_status}</span> para <span className="text-emerald-400 font-bold">{details.new_status}</span>
          </span>
        );
      case "task_blocked":
        return (
          <span className="text-red-400">
            <span className="font-bold text-white">{userName}</span> <strong>BLOQUEOU</strong> a tarefa <span className="font-semibold">"{details.task_title}"</span>: <span className="italic">"{details.reason}"</span>
          </span>
        );
      case "task_unblocked":
        return (
          <span className="text-emerald-400">
            <span className="font-bold text-white">{userName}</span> desbloqueou a tarefa <span className="font-semibold">"{details.task_title}"</span>.
          </span>
        );
      default:
        return <span><span className="font-bold text-white">{userName}</span> realizou uma ação.</span>;
    }
  };

  const getIcon = (action: string) => {
    if (action === "task_blocked") return <AlertOctagon size={12} className="text-red-500" />;
    if (action === "task_unblocked") return <CheckCircle2 size={12} className="text-emerald-500" />;
    return <Activity size={12} className="text-zinc-400" />;
  };

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-zinc-600" size={20} /></div>;
  }

  if (logs.length === 0) {
    return <p className="text-xs text-zinc-500 italic p-4">Nenhuma atividade registada ainda.</p>;
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-3 text-sm">
          <div className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
            log.action === "task_blocked" ? "bg-red-500/10 border-red-500/20" : "bg-zinc-800 border-zinc-700"
          )}>
            {getIcon(log.action)}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-zinc-300 leading-snug">
              {renderLogAction(log)}
            </p>
            <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}