import {
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Users,
  Building2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { cn } from "@/utils/cn";
import { ExecutiveFilter } from "@/components/ExecutiveFilter";

// Forçamos renderização dinâmica para dados financeiros em tempo real
export const dynamic = "force-dynamic";

type BoardRow = { id: string; name: string };

type TaskRow = {
  id: string;
  board_id: string | null;
  client_id: string | null;
  assigned_to: string | null;
  estimated_minutes: number | null;
  status: string;
  target_month: string | null;
};

// ✅ Tipo atualizado para suportar a junção de dados
type TimeLogRow = {
  task_id: string;
  user_id: string | null;
  minutes: number | string | null;
  log_date: string;
  tasks: {
    board_id: string | null;
    client_id: string | null;
    assigned_to: string | null;
    target_month: string | null;
  } | { board_id: string | null; client_id: string | null; assigned_to: string | null; target_month: string | null }[] | null;
};

type UserRateRow = {
  user_id: string | null;
  hourly_rate: number | string | null;
};

type ClientRow = { id: string; name: string };

type ProfileRow = { id: string; full_name: string | null };

type Metric = { name: string; minutes: number; cost: number };

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function ExecutiveDashboard({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { from, to } = await searchParams;

  // ✅ Define o mês atual como padrão (Padrão ERP)
  const currentMonth = new Date().toISOString().slice(0, 7); // Ex: "2024-05"
  const fromMonth = from || currentMonth;
  const toMonth = to || currentMonth;

  // 1. Verificação de Autenticação e Segurança (Acesso Restrito)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileErr) {
    console.error("[ExecutiveDashboard] Erro ao buscar profile:", profileErr);
  }

  if (profile?.role !== "admin" && profile?.role !== "manager") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl">
        <div className="bg-red-500/10 p-4 rounded-full mb-4">
          <ShieldAlert className="text-red-500" size={48} />
        </div>
        <h3 className="text-xl font-bold text-white">Acesso Restrito</h3>
        <p className="text-zinc-400 max-w-xs mt-2">Este painel contém dados sensíveis de faturamento e é restrito à diretoria e gestão financeira.</p>
      </div>
    );
  }

  // 2. Busca Paralela de Alta Velocidade
  // ✅ ALTERAÇÃO SÊNIOR: Forçamos o join com !inner para permitir o filtro por coluna da tabela relacionada.
  let timeLogsQuery = supabase.from("time_logs").select(`
    task_id,
    user_id, 
    minutes, 
    log_date,
    tasks!inner (
      board_id,
      client_id,
      assigned_to,
      target_month
    )
  `, { count: 'exact' });

  // ✅ NOVA REGRA DE CICLO: O custo agora segue o target_month da tarefa.
  // Se você filtrar Maio, verá todos os logs de tarefas do ciclo de Maio, 
  // independente se o log foi feito em Abril ou Junho.
  timeLogsQuery = timeLogsQuery.gte("tasks.target_month", fromMonth).lte("tasks.target_month", toMonth);

  // ✅ Regra de Escopo: O Workload é baseado no planejamento (target_month)
  let tasksQuery = supabase
    .from("tasks")
    .select("id, board_id, client_id, assigned_to, estimated_minutes, status, target_month");
  
  tasksQuery = tasksQuery.gte("target_month", fromMonth).lte("target_month", toMonth);

  const [boardsRes, tasksRes, timeLogsRes, userRatesRes, clientsRes, profilesRes] =
    await Promise.all([
      supabase.from("boards").select("id, name"),
      tasksQuery,
      timeLogsQuery,
      supabase.from("user_rates").select("user_id, hourly_rate"),
      supabase.from("clients").select("id, name").order("name"),
      supabase.from("profiles").select("id, full_name"),
    ]);

  // Não engolir erro (principalmente em cenário RLS)
  if (boardsRes.error)
    console.error("[ExecutiveDashboard] boards error:", boardsRes.error);
  if (tasksRes.error)
    console.error("[ExecutiveDashboard] tasks error:", tasksRes.error);
  if (timeLogsRes.error)
    console.error("[ExecutiveDashboard] time_logs error:", timeLogsRes.error);
  if (userRatesRes.error)
    console.error("[ExecutiveDashboard] user_rates error:", userRatesRes.error);
  if (clientsRes.error)
    console.error("[ExecutiveDashboard] clients error:", clientsRes.error);
  if (profilesRes.error)
    console.error("[ExecutiveDashboard] profiles error:", profilesRes.error);

  const boards = (boardsRes.data ?? []) as BoardRow[];
  const tasks = (tasksRes.data ?? []) as TaskRow[];
  const timeLogs = (timeLogsRes.data ?? []) as unknown as TimeLogRow[];
  const userRates = (userRatesRes.data ?? []) as UserRateRow[];
  const clients = (clientsRes.data ?? []) as ClientRow[];
  const allProfiles = (profilesRes.data ?? []) as ProfileRow[];

  // Helpers robustos
  const normId = (v: unknown) => (v === null || v === undefined ? "" : String(v));

  // ✅ Converte números vindo como "18,18" ou "18.18" (pt-BR)
  const toRateNumber = (v: unknown) => {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const s = String(v).trim();
    if (!s) return 0;

    // Se tem vírgula, tratamos como formato PT-BR (1.234,56). Caso contrário, padrão SQL (1234.56)
    const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  const toMinutesNumber = (v: unknown) => {
    if (v === null || v === undefined) return 0;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ============================================================================
  // MOTOR DE BI
  // ============================================================================

  // Dicionários (Lookups)
  const ratesMap = new Map<string, number>(
    (userRates ?? [])
      .filter((r) => r?.user_id)
      .map((r) => [normId(r.user_id), toRateNumber(r.hourly_rate)])
  );

  const profilesNameMap = new Map<string, string>(
    allProfiles.map((p) => [normId(p.id), p.full_name ?? "Colaborador Externo"])
  );

  // Agregadores
  const boardMetricsMap = new Map<string, Metric>();
  const clientMetricsMap = new Map<string, Metric>();
  const workloadMap = new Map<string, { name: string; estimated: number }>();

  boards?.forEach((b) =>
    boardMetricsMap.set(normId(b.id), { name: b.name, minutes: 0, cost: 0 })
  );

  clients?.forEach((c) =>
    clientMetricsMap.set(normId(c.id), { name: c.name, minutes: 0, cost: 0 })
  );

  clientMetricsMap.set("internal", {
    name: "Operação Interna (Sem Cliente)",
    minutes: 0,
    cost: 0,
  });

  // Inicializa mapa de carga com perfis conhecidos (via rates ou assigned tasks)
  tasks.forEach(t => {
    if (t.assigned_to) {
      const uid = normId(t.assigned_to);

      if (!workloadMap.has(uid)) {
        const userName = profilesNameMap.get(uid) || "Membro da Equipe";
        workloadMap.set(uid, { name: userName, estimated: 0 });
      }
      // BI Insight: Somente o esforço "pendente" ou "em andamento" entra no Workload do ciclo
      if (t.status !== 'done' && t.status !== 'concluído') {
        workloadMap.get(uid)!.estimated += (t.estimated_minutes || 0);
      }
    }
  });

  let totalGlobalCost = 0;
  let totalGlobalMinutes = 0;
  const uniqueUsersLoggingTime = new Set<string>();

  // Diagnóstico
  let logsWithoutRate = 0;
  let logsUserMismatch = 0;

  // PROCESSAMENTO DOS LOGS DE TEMPO (Refatorado para Precisão Financeira)
  timeLogs?.forEach((log) => {
    const rawMinutes = log.minutes;
    const minutes = toMinutesNumber(rawMinutes);
    
    // ✅ NORMALIZAÇÃO SÊNIOR: Supabase pode retornar objeto ou array em joins.
    // Garantimos o acesso seguro ao board_id e client_id.
    const rawTaskData = (log as any).tasks;
    const taskInfo = Array.isArray(rawTaskData) ? rawTaskData[0] : rawTaskData;

    // 🔴 A CORREÇÃO SÊNIOR:
    // O custo deve seguir o dono da entrega (assigned_to). Se um gestor lança horas para um
    // colaborador, o custo deve refletir a taxa de quem é o responsável pela tarefa.
    const assignedId = normId(taskInfo?.assigned_to);
    const logUserId = normId(log.user_id);
    const workerId = assignedId || logUserId;

    if (assignedId && logUserId && assignedId !== logUserId) {
      logsUserMismatch++;
    }

    // Busca a taxa do funcionário real
    let userRate = workerId ? ratesMap.get(workerId) ?? 0 : 0;
    // Fallback: Se o responsável não tem taxa, usa a taxa de quem lançou o log
    // mas evitamos usar a taxa do admin se houver outra opção.
    if ((userRate === undefined || userRate === 0) && logUserId) {
      userRate = ratesMap.get(logUserId) ?? 0;
    }

    if (minutes > 0 && (!userRate || userRate === 0)) {
      logsWithoutRate++;
    }

    const costForThisLog = (minutes / 60) * userRate;

    // Globais
    totalGlobalMinutes += minutes;
    totalGlobalCost += costForThisLog;

    // Contabiliza o funcionário real na equipe alocada
    if (workerId) uniqueUsersLoggingTime.add(workerId);

    // Agrega no Projeto (Board) - Só se o board existir e o taskInfo for válido
    const boardKey = taskInfo?.board_id ? normId(taskInfo.board_id) : null;
    if (boardKey) {
      const bMetric = boardMetricsMap.get(boardKey);
      if (bMetric) {
        bMetric.minutes += minutes;
        bMetric.cost += costForThisLog;
      }
    }

    // Agrega no Cliente
    const clientKey = taskInfo?.client_id ? normId(taskInfo.client_id) : "internal";
    const cMetric = clientMetricsMap.get(clientKey);
    if (cMetric) {
      cMetric.minutes += minutes;
      cMetric.cost += costForThisLog;
    }
  });


  // Converte Maps em Arrays Ordenados por Custo
  const topBoards = Array.from(boardMetricsMap.values())
    .filter((b) => b.cost > 0 || b.minutes > 0)
    .sort((a, b) => b.cost - a.cost);

  const topClients = Array.from(clientMetricsMap.values())
    .filter((c) => c.cost > 0 || c.minutes > 0)
    .sort((a, b) => b.cost - a.cost);

  const teamWorkload = Array.from(workloadMap.entries()).map(([id, data]) => {
    const hours = data.estimated / 60;
    const capacity = 160; // Padrão CLT/Internacional: 40h semanais
    const percentage = Math.round((hours / capacity) * 100);
    return { id, name: data.name, percentage, hours };
  }).filter(m => m.hours > 0) // Remove quem não tem nada atribuído para limpar a UI
    .sort((a, b) => b.percentage - a.percentage);

  // BI KPIs Globais
  const totalGlobalHours = totalGlobalMinutes / 60;
  const averageHourlyCost = totalGlobalHours > 0 ? totalGlobalCost / totalGlobalHours : 0;

  // Métrica de Saúde Operacional (Segurança contra divisão por zero)
  const totalCapacity = uniqueUsersLoggingTime.size * 160;
  const operationalHealth = totalCapacity > 0 ? (totalGlobalHours / totalCapacity) * 100 : 0;

  // Função Helpers (UI)
  const formatTime = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h === 0 && m === 0) return "0h";
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);


  return (
    <div className="mx-auto max-w-7xl pb-10">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="text-emerald-500" />
            Painel Financeiro & Burn Rate
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Visão confidencial de rentabilidade por projeto e custo de manutenção de clientes.
          </p>
        </div>

        {/* Filtro de Período (UI Padrão Internacional) */}
        <ExecutiveFilter fromMonth={fromMonth} toMonth={toMonth} />
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
            <span className={cn(
              "text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded",
              averageHourlyCost > 150 ? "bg-red-500/10 text-red-400" : "bg-zinc-800 text-zinc-400"
            )}>
              Burn Rate: {formatCurrency(averageHourlyCost)}/h
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

      {/* MONITOR DE CARGA E SAÚDE DO TIME (WORKLOAD) */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              Capacidade & Resiliência do Time
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Estimativa de ocupação baseada em cards ativos (Limite: 160h/mês).</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamWorkload.map((member) => (
            <div key={member.id} className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-tighter truncate max-w-[180px]">
                  {member.name}
                </span>
                <span className={cn(
                  "text-sm font-black",
                  member.percentage > 100 ? "text-red-500" : member.percentage > 80 ? "text-amber-500" : "text-emerald-500"
                )}>
                  {member.percentage}%
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    member.percentage > 100 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : member.percentage > 80 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(member.percentage, 100)}%` }}
                />
              </div>
              {member.percentage > 100 && (
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                  <AlertTriangle size={12} /> ALERTA DE BURNOUT: Sobrecarga Detectada
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RELATÓRIO 1: CUSTO POR CLIENTE */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-lg flex flex-col">
          <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/40">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Building2 size={18} className="text-zinc-400" />
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
                        <span className="px-2 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-400 uppercase tracking-widest">
                          Interno
                        </span>
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
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <p className="text-zinc-500 italic">Nenhum dado financeiro de cliente registrado.</p>
                    </td>
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
              <BarChart3 size={18} className="text-zinc-400" />
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
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <p className="text-zinc-500 italic">Nenhum projeto com horas registradas.</p>
                    </td>
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
