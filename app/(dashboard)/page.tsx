import { createClient } from "@/utils/supabase/server";
import { LayoutGrid, CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = 'force-dynamic'; // Garante que a dashboard está sempre atualizada

export default async function DashboardHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Buscar os Quadros do Utilizador
  const { data: boards } = await supabase
    .from("boards")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(4);

  // 2. Buscar as Tarefas Globais para Métricas
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, status, due_date, title, board_id, boards(name)")
    // Num SaaS real, filtraríamos por tenant/empresa. Aqui filtramos pelas tarefas onde o utilizador tem acesso.
    .order("due_date", { ascending: true });

  // 3. Lógica de Negócio: Calcular Métricas
  const allTasks = tasks || [];
  const completedTasks = allTasks.filter(t => t.status === "done" || t.status === "delivery");
  const pendingTasks = allTasks.filter(t => t.status !== "done" && t.status !== "delivery");
  
  const today = new Date();
  const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < today);

  // 4. Buscar Atividade Recente (Comentários)
  const { data: recentComments } = await supabase
    .from("task_comments")
    .select("*, tasks(title, board_id), profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Operacional</h1>
        <p className="text-zinc-400">Visão geral do ecossistema PulseBoard.</p>
      </div>

      {/* Cartões de Métricas Dinâmicos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-indigo-500/10 p-3">
              <LayoutGrid className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Quadros Ativos</p>
              <h3 className="text-2xl font-bold text-white">{boards?.length || 0}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <Clock className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Demandas Pendentes</p>
              <h3 className="text-2xl font-bold text-white">{pendingTasks.length}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-zinc-900/50 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-red-500/10 p-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-400">Tarefas Atrasadas</p>
              <h3 className="text-2xl font-bold text-red-400">{overdueTasks.length}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Tarefas Concluídas</p>
              <h3 className="text-2xl font-bold text-white">{completedTasks.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quadros Recentes */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Os Seus Ecossistemas</h2>
            <Link href="/boards" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {boards?.length === 0 ? (
              <p className="text-sm text-zinc-500 col-span-2">Nenhum quadro criado ainda.</p>
            ) : (
              boards?.map((board) => (
                <Link 
                  key={board.id} 
                  href={`/boards/${board.id}`}
                  className="group flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all"
                >
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">{board.name}</h3>
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{board.description || "Sem descrição"}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-600">
                    <span>Aceder ao quadro</span>
                    <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Atividade Recente (Chat/Comentários) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-lg">
          <h2 className="mb-6 text-lg font-semibold text-white">Radar de Comunicação</h2>
          <div className="space-y-6">
            {recentComments?.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma atividade recente registada.</p>
            ) : (
              recentComments?.map((comment: any) => (
                <div key={comment.id} className="relative pl-6 before:absolute before:left-2 before:top-2 before:h-full before:w-[1px] before:bg-zinc-800 last:before:hidden">
                  <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-zinc-950 bg-indigo-500" />
                  <p className="text-sm text-zinc-300">
                    <span className="font-semibold text-indigo-400">{comment.profiles?.full_name}</span> comentou na tarefa{' '}
                    <Link href={`/boards/${comment.tasks?.board_id}`} className="font-semibold text-white hover:underline">
                      "{comment.tasks?.title}"
                    </Link>
                  </p>
                  <p className="mt-1 text-sm text-zinc-400 italic bg-zinc-900/50 p-2 rounded border border-zinc-800/50">
                    "{comment.content}"
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {format(new Date(comment.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}