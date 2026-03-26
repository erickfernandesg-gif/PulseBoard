import { Filter, Download, LayoutDashboard } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function ReportsPage() {
  // Inicializa o cliente do Supabase no lado do servidor para maior segurança e performance
  const supabase = await createClient();

  // Busca todos os boards (Projetos)
  const { data: boards, error: boardsError } = await supabase
    .from("boards")
    .select("*")
    .order("created_at", { ascending: false });

  // Busca todas as tarefas
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, board_id, status");

  // Processamento e cruzamento de dados (Lógica de Negócio Operacional)
  const reportData = boards?.map((board) => {
    const boardTasks = tasks?.filter((t) => t.board_id === board.id) || [];
    const totalTasks = boardTasks.length;
    
    // Consideramos concluídas as tarefas na coluna 'done' (ajuste se o seu status de conclusão for diferente)
    const completedTasks = boardTasks.filter((t) => t.status === "done" || t.status === "Feito").length;
    
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    // Definição dinâmica do status de saúde do projeto
    let statusLabel = "Crítico";
    let statusColor = "text-red-400 bg-red-500/10";
    let barColor = "bg-red-500";

    if (totalTasks === 0) {
      statusLabel = "Vazio";
      statusColor = "text-zinc-400 bg-zinc-500/10";
      barColor = "bg-zinc-500";
    } else if (completionRate === 100) {
      statusLabel = "Concluído";
      statusColor = "text-blue-400 bg-blue-500/10";
      barColor = "bg-blue-500";
    } else if (completionRate >= 70) {
      statusLabel = "Saudável";
      statusColor = "text-emerald-400 bg-emerald-500/10";
      barColor = "bg-emerald-500";
    } else if (completionRate >= 30) {
      statusLabel = "Atenção";
      statusColor = "text-amber-400 bg-amber-500/10";
      barColor = "bg-amber-500";
    }

    return {
      id: board.id,
      name: board.name,
      totalTasks,
      completedTasks,
      completionRate,
      statusLabel,
      statusColor,
      barColor,
    };
  }) || [];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <LayoutDashboard className="text-indigo-500" />
            Relatórios Operacionais
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Visão macro da saúde e progresso dos projetos ativos.
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-md bg-zinc-800 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors">
            <Filter size={16} />
            Filtros
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Desempenho por Projeto</h2>
          <span className="text-sm text-zinc-400">Total de {boards?.length || 0} projetos</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-800/50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-3">Projeto</th>
                <th className="px-6 py-3">Total de Tarefas</th>
                <th className="px-6 py-3">Tarefas Concluídas</th>
                <th className="px-6 py-3">Taxa de Conclusão</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    Nenhum projeto encontrado.
                  </td>
                </tr>
              ) : (
                reportData.map((project) => (
                  <tr key={project.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{project.name}</td>
                    <td className="px-6 py-4">{project.totalTasks}</td>
                    <td className="px-6 py-4">{project.completedTasks}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 rounded-full bg-zinc-800 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${project.barColor}`} 
                            style={{ width: `${project.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-zinc-300 min-w-[3ch]">{project.completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${project.statusColor}`}>
                        {project.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}