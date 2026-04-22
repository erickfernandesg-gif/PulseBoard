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
    <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-8 animate-in fade-in duration-500 text-slate-900">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Operacional</h1>
        <p className="text-slate-500">Visão geral do ecossistema PulseBoard.</p>
      </div>

      {/* Cartões de Métricas Dinâmicos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-indigo-50 p-3 border border-indigo-100">
              <LayoutGrid className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Quadros Ativos</p>
              <h3 className="text-2xl font-bold text-slate-900">{boards?.length || 0}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-amber-50 p-3 border border-amber-100">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Demandas Pendentes</p>
              <h3 className="text-2xl font-bold text-slate-900">{pendingTasks.length}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-red-50 p-3 border border-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-600 uppercase tracking-wider text-[10px] font-bold">Tarefas Atrasadas</p>
              <h3 className="text-2xl font-bold text-red-700">{overdueTasks.length}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Tarefas Concluídas</p>
              <h3 className="text-2xl font-bold text-slate-900">{completedTasks.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quadros Recentes */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Os Seus Ecossistemas</h2>
            <Link href="/boards" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {boards?.length === 0 ? (
              <p className="text-sm text-slate-400 col-span-2 italic">Nenhum quadro criado ainda.</p>
            ) : (
              boards?.map((board) => (
                <Link 
                  key={board.id} 
                  href={`/boards/${board.id}`}
                  className="group flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50 p-5 hover:border-indigo-300 hover:bg-white hover:shadow-md transition-all"
                >
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{board.name}</h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{board.description || "Sem descrição"}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-500 transition-colors">
                    <span>Aceder ao quadro</span>
                    <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Atividade Recente (Chat/Comentários) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-bold text-slate-900">Radar de Comunicação</h2>
          <div className="space-y-6">
            {recentComments?.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nenhuma atividade recente registada.</p>
            ) : (
              recentComments?.map((comment: any) => (
                <div key={comment.id} className="relative pl-6 before:absolute before:left-2 before:top-2 before:h-full before:w-[1px] before:bg-slate-100 last:before:hidden">
                  <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-indigo-600 shadow-sm" />
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-indigo-600">{comment.profiles?.full_name}</span> comentou na tarefa{' '}
                    <Link href={`/boards/${comment.tasks?.board_id}`} className="font-bold text-slate-900 hover:text-indigo-600 hover:underline transition-colors">
                      "{comment.tasks?.title}"
                    </Link>
                  </p>
                  <p className="mt-1 text-sm text-slate-600 italic bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-inner">
                    "{comment.content}"
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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