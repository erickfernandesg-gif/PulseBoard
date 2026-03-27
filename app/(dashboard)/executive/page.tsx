import { BarChart3, TrendingUp, DollarSign, AlertTriangle, Briefcase, Clock, Users, Building2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// Forçamos renderização dinâmica para dados financeiros em tempo real
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

  // 2. Busca Paralela de Alta Velocidade (Incluindo Clientes!)
  const [
    { data: boards },
    { data: tasks },
    { data: timeLogs },
    { data: userRates },
    { data: clients }
  ] = await Promise.all([
    supabase.from('boards').select('id, name'),
    supabase.from('tasks').select('id, board_id, client_id'), // Incluímos client_id
    supabase.from('time_logs').select('task_id, user_id, minutes'),
    supabase.from('user_rates').select('user_id, hourly_rate'),
    supabase.from('clients').select('id, name')
  ]);

  // ============================================================================
  // MOTOR DE BI: OTIMIZAÇÃO O(N) PARA ALTA ESCALABILIDADE
  // Em vez de loops aninhados, usamos Maps para buscar dados em milissegundos.
  // ============================================================================
  
  // Dicionários (Lookups)
  const ratesMap = new Map(userRates?.map(r => [r.user_id, Number(r.hourly_rate)]) || []);
  const taskMap = new Map(tasks?.map(t => [t.id, { board_id: t.board_id, client_id: t.client_id }]) || []);
  
  // Agregadores
  const boardMetricsMap = new Map();
  const clientMetricsMap = new Map();

  boards?.forEach(b => boardMetricsMap.set(b.id, { name: b.name, minutes: 0, cost: 0 }));
  clients?.forEach(c => clientMetricsMap.set(c.id, { name: c.name, minutes: 0, cost: 0 }));
  clientMetricsMap.set('internal', { name: 'Operação Interna (Sem Cliente)', minutes: 0, cost: 0 });

  let totalGlobalCost = 0;
  let totalGlobalMinutes = 0;
  const uniqueUsersLoggingTime = new Set();

  // ÚNICO LOOP PELOS LOGS DE TEMPO (Máxima Performance)
  timeLogs?.forEach(log => {
    const taskInfo = taskMap.get(log.task_id);
    if (!taskInfo) return; // Ignora logs órfãos

    const userRate = ratesMap.get(log.user_id) || 0;
    const costForThisLog = (log.minutes / 60) * userRate;

    totalGlobalMinutes += log.minutes;
    totalGlobalCost += costForThisLog;
    uniqueUsersLoggingTime.add(log.user_id);

    // Agrega no Projeto (Board)
    if (taskInfo.board_id && boardMetricsMap.has(taskInfo.board_id)) {
      const bMetric = boardMetricsMap.get(taskInfo.board_id);
      bMetric.minutes += log.minutes;
      bMetric.cost += costForThisLog;
    }

    // Agrega no Cliente
    const clientKey = taskInfo.client_id || 'internal';
    if (clientMetricsMap.has(clientKey)) {
      const cMetric = clientMetricsMap.get(clientKey);
      cMetric.minutes += log.minutes;
      cMetric.cost += costForThisLog;
    }
  });

  // Converte Maps em Arrays Ordenados por Custo
  const topBoards = Array.from(boardMetricsMap.values())
    .filter(b => b.cost > 0 || b.minutes > 0)
    .sort((a, b) => b.cost - a.cost);

  const topClients = Array.from(clientMetricsMap.values())
    .filter(c => c.cost > 0 || c.minutes > 0)
    .sort((a, b) => b.cost - a.cost);

  // BI KPIs Globais
  const totalGlobalHours = totalGlobalMinutes / 60;
  const averageHourlyCost = totalGlobalHours > 0 ? (totalGlobalCost / totalGlobalHours) : 0;

  // Função Helpers (UI)
  const formatTime = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h === 0 && m === 0) return "0h";
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <TrendingUp className="text-emerald-500" />
          Painel Financeiro & Burn Rate
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Visão confidencial de rentabilidade por projeto e custo de aquisição/manutenção de clientes.
        </p>
      </div>

      {/* KPIs Globais */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full -mr-8 -mt-8" />
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <DollarSign size={20} />
            <span className="text-sm font-medium uppercase tracking-wider">Custo de Operação</span>
          </div>
          <p className="text-3xl font-bold text-white relative z-10">
            {formatCurrency(totalGlobalCost)}
          </p>
          <div className="flex items-center gap-2 mt-2 relative z-10">
            <span className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase bg-zinc-800 px-2 py-1 rounded">
              Média: {formatCurrency(averageHourlyCost)} / hora
            </span>
          </div>
        </div>
        
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-indigo-400 mb-2">
            <Clock size={20} />
            <span className="text-sm font-medium uppercase tracking-wider">Tempo Faturado</span>
          </div>
          <p className="text-3xl font-bold text-white">{formatTime(totalGlobalMinutes)}</p>
          <p className="text-xs text-zinc-500 mt-1">Horas totais registradas</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-amber-400 mb-2">
            <Building2 size={20} />
            <span className="text-sm font-medium uppercase tracking-wider">Clientes Atendidos</span>
          </div>
          <p className="text-3xl font-bold text-white">{topClients.length}</p>
          <p className="text-xs text-zinc-500 mt-1">Consumindo caixa atualmente</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-blue-400 mb-2">
            <Users size={20} />
            <span className="text-sm font-medium uppercase tracking-wider">Equipe Alocada</span>
          </div>
          <p className="text-3xl font-bold text-white">{uniqueUsersLoggingTime.size}</p>
          <p className="text-xs text-zinc-500 mt-1">Colaboradores ativos nos projetos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RELATÓRIO 1: CUSTO POR CLIENTE */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-lg flex flex-col">
          <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/40">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Building2 size={18} className="text-zinc-400"/> 
              Custo de Operação por Cliente
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Saiba exatamente quanto de folha de pagamento cada cliente está consumindo.
            </p>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/60 text-[10px] uppercase text-zinc-500 border-b border-zinc-800 tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-bold">Cliente</th>
                  <th className="px-6 py-3 font-bold text-right">Horas</th>
                  <th className="px-6 py-3 font-bold text-right">Custo Real</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {topClients.map((client, i) => (
                  <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                      {client.name}
                      {client.name === 'Operação Interna (Sem Cliente)' && (
                        <span className="px-2 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-400 uppercase tracking-widest">Interno</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-zinc-400">{formatTime(client.minutes)}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-400">
                      {formatCurrency(client.cost)}
                    </td>
                  </tr>
                ))}
                {topClients.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-zinc-500">Sem dados financeiros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RELATÓRIO 2: CUSTO POR PROJETO */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-lg flex flex-col">
          <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/40">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-zinc-400"/> 
              Burn Rate por Projeto (Board)
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Quais frentes de trabalho estão consumindo mais recursos da empresa.
            </p>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/60 text-[10px] uppercase text-zinc-500 border-b border-zinc-800 tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-bold">Projeto</th>
                  <th className="px-6 py-3 font-bold text-right">Horas</th>
                  <th className="px-6 py-3 font-bold text-right">Custo Real</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {topBoards.map((board, i) => (
                  <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{board.name}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-zinc-400">{formatTime(board.minutes)}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-400">
                      {formatCurrency(board.cost)}
                    </td>
                  </tr>
                ))}
                {topBoards.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-zinc-500">Sem dados de projetos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}