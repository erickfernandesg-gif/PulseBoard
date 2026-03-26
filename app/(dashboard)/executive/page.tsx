import { BarChart3, TrendingUp, DollarSign, AlertTriangle, Briefcase, Clock, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// Forçamos renderização dinâmica para que os dados financeiros estejam sempre atualizados
export const dynamic = 'force-dynamic';

export default async function ExecutiveDashboard() {
  const supabase = await createClient();

  // 1. Verificação de Autenticação e Segurança (Acesso Restrito)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'manager') {
    return (
      <div className="mx-auto max-w-7xl flex flex-col items-center justify-center min-h-[60vh]">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white">Acesso Negado</h2>
        <p className="text-zinc-400 mt-2">Esta área é restrita à diretoria e gestão financeira.</p>
      </div>
    );
  }

  // 2. Busca paralela de todos os dados necessários
  const [
    { data: boards },
    { data: tasks },
    { data: timeLogs },
    { data: userRates }
  ] = await Promise.all([
    supabase.from('boards').select('id, name'),
    supabase.from('tasks').select('id, board_id'),
    supabase.from('time_logs').select('task_id, user_id, minutes'),
    supabase.from('user_rates').select('user_id, hourly_rate')
  ]);

  // ============================================================================
  // OTIMIZAÇÃO DE PERFORMANCE (Para suportar milhares de registros sem travar)
  // ============================================================================
  
  // Cria um Dicionário (Map) de taxas para busca instantânea O(1)
  const ratesMap = new Map(userRates?.map(r => [r.user_id, Number(r.hourly_rate)]) || []);

  let totalGlobalCost = 0;
  let totalGlobalMinutes = 0;
  const uniqueUsersLoggingTime = new Set();

  const boardMetrics = boards?.map(board => {
    let boardCost = 0;
    let boardMinutes = 0;

    // Filtra tarefas que pertencem a este board e cria um Set para busca O(1)
    const boardTasks = tasks?.filter(t => t.board_id === board.id) || [];
    const taskIds = new Set(boardTasks.map(t => t.id));

    // Filtra apontamentos de horas que pertencem às tarefas deste board
    const boardLogs = timeLogs?.filter(log => taskIds.has(log.task_id)) || [];

    boardLogs.forEach(log => {
      boardMinutes += log.minutes;
      uniqueUsersLoggingTime.add(log.user_id);
      
      // Busca a taxa instantaneamente no Map. Se não achar, R$ 0,00.
      const userRate = ratesMap.get(log.user_id) || 0;
      
      // Custo = (minutos / 60) * valor_da_hora
      const costForThisLog = (log.minutes / 60) * userRate;
      boardCost += costForThisLog;
    });

    totalGlobalCost += boardCost;
    totalGlobalMinutes += boardMinutes;

    return {
      id: board.id,
      name: board.name,
      hours: (boardMinutes / 60).toFixed(1),
      cost: boardCost
    };
  }).sort((a, b) => b.cost - a.cost) || []; // Ordena dos projetos mais caros para os mais baratos

  // BI: Custo médio da hora da empresa (Prevenção de divisão por zero)
  const totalGlobalHours = totalGlobalMinutes / 60;
  const averageHourlyCost = totalGlobalHours > 0 ? (totalGlobalCost / totalGlobalHours) : 0;

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <TrendingUp className="text-emerald-500" />
          Painel Executivo de Custos
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Visão confidencial de produtividade e queima de caixa em tempo real.
        </p>
      </div>

      {/* KPIs Globais Calculados */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full -mr-8 -mt-8" />
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <DollarSign size={20} />
            <span className="text-sm font-medium">Custo Operacional</span>
          </div>
          <p className="text-3xl font-bold text-white relative z-10">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGlobalCost)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-zinc-500 font-medium bg-zinc-800 px-2 py-0.5 rounded">
              Média: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(averageHourlyCost)} / hora
            </span>
          </div>
        </div>
        
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-indigo-400 mb-2">
            <Clock size={20} />
            <span className="text-sm font-medium">Horas Produtivas</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalGlobalHours.toFixed(0)}h</p>
          <p className="text-xs text-zinc-500 mt-1">Registradas em atividades</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-amber-400 mb-2">
            <Briefcase size={20} />
            <span className="text-sm font-medium">Projetos Ativos</span>
          </div>
          <p className="text-3xl font-bold text-white">{boards?.length || 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Quadros monitorados</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-blue-400 mb-2">
            <Users size={20} />
            <span className="text-sm font-medium">Colaboradores</span>
          </div>
          <p className="text-3xl font-bold text-white">{uniqueUsersLoggingTime.size}</p>
          <p className="text-xs text-zinc-500 mt-1">Registrando tempo ativamente</p>
        </div>
      </div>

      {/* Relatório Detalhado por Projeto */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-lg">
        <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/40">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <BarChart3 size={18} className="text-zinc-400"/> 
            Distribuição de Custos por Projeto
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Custos consolidados baseados no time tracking e valor/hora individual dos membros da equipe.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-900/60 text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">Nome do Projeto (Board)</th>
                <th className="px-6 py-4 font-bold tracking-wider text-right">Horas Investidas</th>
                <th className="px-6 py-4 font-bold tracking-wider text-right">Custo Total (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {boardMetrics.map((board) => (
                <tr key={board.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{board.name}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="bg-zinc-800 text-zinc-300 py-1 px-3 rounded-full text-xs">
                      {board.hours}h
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(board.cost)}
                  </td>
                </tr>
              ))}
              
              {boardMetrics.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-500">
                    Nenhum dado financeiro ou de projetos registrado no momento.
                  </td>
                </tr>
              )}
            </tbody>
            {boardMetrics.length > 0 && (
              <tfoot className="bg-zinc-900/60 border-t border-zinc-800 font-bold">
                <tr>
                  <td className="px-6 py-4 text-white">TOTAL GLOBAL</td>
                  <td className="px-6 py-4 text-right text-zinc-300">{totalGlobalHours.toFixed(1)}h</td>
                  <td className="px-6 py-4 text-right text-emerald-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGlobalCost)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}