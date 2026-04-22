"use client";

import { useState, useEffect, useCallback } from "react";
import { Filter, Download, LayoutDashboard, TrendingUp, CheckCircle2, AlertCircle, Loader2, Users, Clock, DollarSign, AlertOctagon, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function ReportsPage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  
  // Dados Brutos
  const [boards, setBoards] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [userRates, setUserRates] = useState<any[]>([]);
  
  // Filtros Ativos
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedUser, setSelectedUser] = useState(""); // NOVO ESTADO: Filtro por Pessoa

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Busca Paralela Otimizada MÁXIMA (Trazendo o Financeiro e Logs de Tempo)
      const [boardsRes, tasksRes, teamsRes, profilesRes, timeRes, ratesRes] = await Promise.all([
        supabase.from("boards").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select("id, board_id, status, created_at, assigned_to, is_blocked"),
        supabase.from("teams").select("*").order("name"),
        supabase.from("profiles").select("id, team_id, full_name, email").order("full_name"),
        supabase.from("time_logs").select("*"),
        supabase.from("user_rates").select("*")
      ]);

      if (boardsRes.error) throw boardsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      setBoards(boardsRes.data || []);
      setTasks(tasksRes.data || []);
      setTeams(teamsRes.data || []);
      setProfiles(profilesRes.data || []);
      setTimeLogs(timeRes.data || []);
      setUserRates(ratesRes.data || []);
    } catch (error) {
      console.error("Erro ao buscar dados do relatório:", error);
      toast.error("Erro ao carregar os relatórios operacionais e financeiros.");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Formatações Utilitárias (Helpers de UX)
  const formatTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0 && mins === 0) return "0h";
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Helpers de Precisão Financeira (Mesma lógica do Executive Dashboard)
  const normId = (v: any) => (v === null || v === undefined ? "" : String(v));

  const toRateNumber = (v: any) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const s = String(v).trim();
    if (!s) return 0;
    const normalized = s.replace(/\./g, "").replace(",", ".");
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  const toMinutesNumber = (v: any) => {
    if (v === null || v === undefined) return 0;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // --- MOTOR DE REGRAS BI (Com Cruzamento Relacional e Financeiro) ---
  const processReportData = () => {
    // 0. Preparação de Dicionários (Lookups) para Alta Performance O(1)
    const ratesMap = new Map<string, number>(
      userRates.map((r) => [normId(r.user_id), toRateNumber(r.hourly_rate)])
    );

    const taskMap = new Map<string, any>(
      tasks.map((t) => [normId(t.id), t])
    );

    let filteredTasks = tasks;

    // 1. Filtros de Escopo
    if (selectedUser) {
      filteredTasks = filteredTasks.filter(task => normId(task.assigned_to) === selectedUser);
    }

    if (selectedMonth) {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.created_at) return false;
        return task.created_at.substring(0, 7) === selectedMonth;
      });
    }

    if (selectedTeam) {
      const usersInThisTeam = profiles
        .filter(profile => profile.team_id === selectedTeam)
        .map(profile => profile.id);

      filteredTasks = filteredTasks.filter(task => 
        task.assigned_to && usersInThisTeam.includes(normId(task.assigned_to))
      );
    }

    const reportData = boards.map((board) => {
      const boardTasks = filteredTasks.filter((t) => t.board_id === board.id);
      const boardTaskIds = boardTasks.map(t => t.id);
      
      // Métricas de Volume
      const totalTasks = boardTasks.length;
      const completedTasks = boardTasks.filter((t) => t.status === "done" || t.status === "Feito" || t.status === "concluído").length;
      const blockedTasks = boardTasks.filter((t) => t.is_blocked).length;
      const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      // Métricas de Tempo e Dinheiro (Custo Real)
      let totalMinutes = 0;
      let totalCost = 0;

      const boardTimeLogs = timeLogs.filter(log => boardTaskIds.includes(normId(log.task_id)));
      
      boardTimeLogs.forEach(log => {
        const minutes = toMinutesNumber(log.minutes);
        const taskId = normId(log.task_id);
        const taskInfo = taskMap.get(taskId);

        // 🔴 A REGRA SÊNIOR: Custo segue o dono da entrega (assigned_to)
        const assignedId = normId(taskInfo?.assigned_to);
        const logUserId = normId(log.user_id);
        const workerId = assignedId || logUserId;

        let userRate = workerId ? ratesMap.get(workerId) ?? 0 : 0;

        // Fallback para quem logou caso o responsável não tenha taxa cadastrada
        if ((userRate === undefined || userRate === 0) && logUserId) {
          userRate = ratesMap.get(logUserId) ?? 0;
        }
        
        totalMinutes += minutes;
        totalCost += (minutes / 60) * userRate;
      });

      // Status Visual da Operação
      let statusLabel = "Crítico";
      let statusColor = "text-red-700 bg-red-50 border-red-100";
      let barColor = "bg-red-500";

      if (totalTasks === 0) {
        statusLabel = "Sem Demandas";
        statusColor = "text-slate-500 bg-slate-50 border-slate-200";
        barColor = "bg-slate-200";
      } else if (completionRate === 100) {
        statusLabel = "Concluído";
        statusColor = "text-blue-700 bg-blue-50 border-blue-100";
        barColor = "bg-blue-500";
      } else if (blockedTasks > 0) {
        statusLabel = "Impedido";
        statusColor = "text-amber-700 bg-amber-50 border-amber-100";
        barColor = "bg-amber-500";
      } else if (completionRate >= 70) {
        statusLabel = "Saudável";
        statusColor = "text-emerald-700 bg-emerald-50 border-emerald-100";
        barColor = "bg-emerald-500";
      } else if (completionRate >= 30) {
        statusLabel = "Atenção";
        statusColor = "text-amber-700 bg-amber-50 border-amber-100";
        barColor = "bg-amber-500";
      }

      return {
        id: board.id,
        name: board.name,
        totalTasks,
        completedTasks,
        blockedTasks,
        completionRate,
        totalMinutes,
        totalCost,
        statusLabel,
        statusColor,
        barColor,
      };
    });

    // UX: Oculta projetos vazios se houver qualquer filtro ativo
    if (selectedMonth || selectedTeam || selectedUser) {
      return reportData.filter(project => project.totalTasks > 0);
    }

    return reportData;
  };

  const reportData = processReportData();

  // --- MÉTRICAS GLOBAIS EXECUTIVAS ---
  const globalTotalTasks = reportData.reduce((acc, curr) => acc + curr.totalTasks, 0);
  const globalCompletedTasks = reportData.reduce((acc, curr) => acc + curr.completedTasks, 0);
  const globalBlockedTasks = reportData.reduce((acc, curr) => acc + curr.blockedTasks, 0);
  const globalTotalMinutes = reportData.reduce((acc, curr) => acc + curr.totalMinutes, 0);
  const globalTotalCost = reportData.reduce((acc, curr) => acc + curr.totalCost, 0);
  const globalCompletionRate = globalTotalTasks === 0 ? 0 : Math.round((globalCompletedTasks / globalTotalTasks) * 100);

  // --- EXPORTAÇÃO EXCEL DINÂMICA (Nível Diretoria) ---
  const exportToExcel = () => {
    try {
      if (reportData.length === 0) return toast.info("Não há dados para exportar com estes filtros.");

      const excelData = reportData.map(row => ({
        "Nome do Projeto": row.name,
        "Total de Tarefas": row.totalTasks,
        "Tarefas Concluídas": row.completedTasks,
        "Tarefas com Impedimento": row.blockedTasks,
        "Taxa de Conclusão (%)": `${row.completionRate}%`,
        "Horas Investidas": formatTime(row.totalMinutes),
        "Custo Operacional (R$)": formatCurrency(row.totalCost),
        "Status da Operação": row.statusLabel
      }));

      excelData.push({
        "Nome do Projeto": "TOTAL GERAL DA SELEÇÃO",
        "Total de Tarefas": globalTotalTasks,
        "Tarefas Concluídas": globalCompletedTasks,
        "Tarefas com Impedimento": globalBlockedTasks,
        "Taxa de Conclusão (%)": `${globalCompletionRate}%`,
        "Horas Investidas": formatTime(globalTotalMinutes),
        "Custo Operacional (R$)": formatCurrency(globalTotalCost),
        "Status da Operação": globalBlockedTasks > 0 ? "ATENÇÃO" : "SAUDÁVEL"
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 20 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Visão Executiva");

      let teamNameForFile = "Geral";
      if (selectedTeam) {
        const t = teams.find(t => t.id === selectedTeam);
        if (t) teamNameForFile = t.name.replace(/[^a-zA-Z0-9]/g, "_");
      }

      let userForFile = "";
      if (selectedUser) {
        const p = profiles.find(p => p.id === selectedUser);
        if (p) userForFile = "_" + (p.full_name || "Membro").replace(/[^a-zA-Z0-9]/g, "_");
      }
      
      const monthForFile = selectedMonth ? `_${selectedMonth}` : "";
      const fileName = `Dash_Operacional_PulseBoard_${teamNameForFile}${userForFile}${monthForFile}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar arquivo Excel.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl pb-10 text-slate-900">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="text-indigo-500" /> Relatórios Operacionais
          </h1>
          <p className="text-sm text-slate-500 mt-1">Análise de produtividade, gargalos operacionais e entregas da equipe.</p>
        </div>
        
        {/* BARRA DE FILTROS AVANÇADA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex-wrap justify-end">
          
          {/* Filtro de Equipe */}
          <div className="flex items-center gap-2 px-2 bg-slate-50 rounded-lg border border-slate-200">
            <Users size={14} className="text-slate-400 ml-1" />
            <select 
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent text-sm text-slate-900 rounded pr-8 py-2 outline-none focus:ring-0 appearance-none min-w-[140px] cursor-pointer"
            >
              <option value="">Todas as Equipes</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          {/* Filtro de Pessoa */}
          <div className="flex items-center gap-2 px-2 bg-slate-50 rounded-lg border border-slate-200">
            <User size={14} className="text-slate-400 ml-1" />
            <select 
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="bg-transparent text-sm text-slate-900 rounded pr-8 py-2 outline-none focus:ring-0 appearance-none min-w-[140px] cursor-pointer"
            >
              <option value="">Todos os Membros</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Mês */}
          <div className="flex items-center gap-2 px-2 bg-slate-50 rounded-lg border border-slate-200">
            <Filter size={14} className="text-slate-400 ml-1" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm text-slate-900 rounded px-1 py-1.5 outline-none min-w-[130px] cursor-pointer"
            />
          </div>

          {/* Botão de Limpar */}
          {(selectedMonth || selectedTeam || selectedUser) && (
            <button 
              onClick={() => { setSelectedMonth(""); setSelectedTeam(""); setSelectedUser(""); }} 
              className="text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-2 bg-slate-100 rounded-lg transition-colors border border-slate-200 hover:border-slate-300"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
      ) : (
        <>
          {/* CARDS DE MÉTRICAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col relative overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <CheckCircle2 size={16} className="text-indigo-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider">Desempenho Global</h3>
              </div>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-slate-900">{globalCompletionRate}%</span>
                <span className="text-xs text-slate-400 font-medium mb-1.5">{globalCompletedTasks} de {globalTotalTasks}</span>
              </div>
              <div className="w-full h-1 bg-slate-100 rounded-full mt-auto">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${globalCompletionRate}%` }}></div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <AlertOctagon size={16} className={globalBlockedTasks > 0 ? "text-red-500" : "text-slate-400"} />
                <h3 className="text-[11px] font-bold uppercase tracking-wider">Impedimentos / Gargalos</h3>
              </div>
              <span className={`text-3xl font-bold mt-1 ${globalBlockedTasks > 0 ? "text-red-600" : "text-slate-900"}`}>
                {globalBlockedTasks}
              </span>
              <p className="text-[10px] text-slate-400 mt-auto uppercase tracking-wide">Tarefas paradas aguardando ação</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Clock size={16} className="text-amber-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider">Horas Investidas</h3>
              </div>
              <span className="text-3xl font-bold text-slate-900 mt-1">{formatTime(globalTotalMinutes)}</span>
              <p className="text-[10px] text-slate-400 mt-auto uppercase tracking-wide">Tempo logado na seleção</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col relative overflow-hidden shadow-sm">
              <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                <DollarSign size={100} className="text-slate-900" />
              </div>
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <DollarSign size={16} className="text-emerald-500" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider">Custo de Operação</h3>
              </div>
              <span className="text-3xl font-bold text-emerald-400 mt-1">{formatCurrency(globalTotalCost)}</span>
              <p className="text-[10px] text-slate-400 mt-auto uppercase tracking-wide">Com base nas taxas cadastradas</p>
            </div>

          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Análise Detalhada por Projeto</h2>
                {(selectedMonth || selectedTeam || selectedUser) && (
                  <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mt-1 inline-block uppercase tracking-wider">
                    Visualizando dados filtrados
                  </span>
                )}
              </div>
              <button 
                onClick={exportToExcel}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-sm w-full sm:w-auto"
              >
                <Download size={16} /> Exportar Excel
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-bold">Projeto</th>
                    <th className="px-6 py-4 font-bold text-center">Progresso</th>
                    <th className="px-6 py-4 font-bold text-center">Bloqueios</th>
                    <th className="px-6 py-4 font-bold text-right">Tempo Logado</th>
                    <th className="px-6 py-4 font-bold text-right">Custo Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 border border-dashed border-slate-200 m-4 rounded-lg bg-slate-50 italic">
                        Nenhum dado encontrado para a combinação de filtros selecionada.
                      </td>
                    </tr>
                  ) : (
                    reportData.map((project: any) => (
                      <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-900 mb-1">{project.name}</p>
                          <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${project.statusColor}`}>
                            {project.statusLabel}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-slate-900 font-bold">{project.completionRate}%</span>
                            <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                              <div className={`h-full rounded-full ${project.barColor} transition-all duration-500`} style={{ width: `${project.completionRate}%` }}></div>
                            </div>
                            <span className="text-[10px] text-slate-400">{project.completedTasks} de {project.totalTasks} tarefas</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {project.blockedTasks > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded-md text-xs font-bold">
                              <AlertOctagon size={12} /> {project.blockedTasks}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-amber-600">
                          {formatTime(project.totalMinutes)}
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-emerald-600">
                          {formatCurrency(project.totalCost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}