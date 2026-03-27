import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { BoardClient } from "@/components/BoardClient";
import { LayoutTemplate } from "lucide-react";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;

  // PERFOMANCE SÊNIOR: Buscamos Quadro, Tarefas e Perfis AO MESMO TEMPO em paralelo
  // Isso reduz o tempo de carregamento da página (TTFB) drasticamente.
  const [
    { data: board, error: boardError },
    { data: tasks },
    { data: profiles }
  ] = await Promise.all([
    supabase.from("boards").select("*").eq("id", id).single(),
    
    // O ELO PERDIDO: Buscando Perfis E Clientes logo no primeiro carregamento!
    supabase
      .from("tasks")
      .select("*, profiles(full_name, avatar_url), clients(name)")
      .eq("board_id", id)
      .order("position_index", { ascending: true }),
      
    // PAYLOAD OTIMIZADO: Trazendo apenas os dados necessários dos usuários
    supabase.from("profiles").select("id, full_name, email, avatar_url")
  ]);

  if (boardError || !board) {
    notFound();
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      {/* Cabeçalho do Quadro Otimizado */}
      <div className="mb-6 flex items-start justify-between bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/60 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 shadow-sm hidden sm:flex">
            <LayoutTemplate className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {board.name}
            </h1>
            {board.description ? (
              <p className="mt-1 text-sm text-zinc-400 max-w-2xl leading-relaxed">
                {board.description}
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500 uppercase tracking-widest font-bold">
                Quadro de Operação Ativo
              </p>
            )}
          </div>
        </div>
        
        {/* Espaço para futuras métricas rápidas do quadro (ex: total de tarefas) */}
        <div className="hidden md:flex flex-col items-end justify-center">
          <span className="text-3xl font-bold text-white leading-none">{tasks?.length || 0}</span>
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">Demandas Totais</span>
        </div>
      </div>

      <BoardClient
        board={board}
        initialTasks={tasks || []}
        profiles={profiles || []}
      />
    </div>
  );
}