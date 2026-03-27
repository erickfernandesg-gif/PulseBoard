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

  // --- MOTOR DE REGRAS BI (Com Cruzamento Relacional e Financeiro) ---
  const processReportData = () => {
    let filteredTasks = tasks;

    // 1. Aplica o Filtro de Mês
    if (selectedMonth) {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.created_at) return false;
        return task.created_at.substring(0, 7) === selectedMonth;
      });
    }

    // 2. Aplica o Filtro de Equipe
    if (selectedTeam) {
      const usersInThisTeam = profiles
        .filter(profile => profile.team_id === selectedTeam)
        .map(profile => profile.id);

      filteredTasks = filteredTasks.filter(task => 
        task.assigned_to && usersInThisTeam.includes(task.assigned_to)
      );
    }

    // 3. Aplica o Filtro de Pessoa (Individual)
    if (selectedUser) {
      filteredTasks = filteredTasks.filter(task => task.assigned_to === selectedUser);
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

      const boardTimeLogs = timeLogs.filter(log => boardTaskIds.includes(log.task_id));
      
      boardTimeLogs.forEach(log => {
        totalMinutes += log.minutes;
        const userRateInfo = userRates.find(r => r.user_id === log.user_id);
        const hourlyRate = userRateInfo ? Number(userRateInfo.hourly_rate) : 0;
        
        // Regra de Negócio: (Minutos / 60) * Valor da Hora = Custo do Apontamento
        totalCost += (log.minutes / 60) * hourlyRate;
      });

      // Status Visual da Operação
      let statusLabel = "Crítico";
      let statusColor = "text-red-400 bg-red-500/10 border-red-500/20";
      let barColor = "bg-red-500";

      if (totalTasks === 0) {
        statusLabel = "Sem Demandas";
        statusColor = "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
        barColor = "bg-zinc-500";
      } else if (completionRate === 100) {
        statusLabel = "Concluído";
        statusColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
        barColor = "bg-blue-500";
      } else if (blockedTasks > 0) {
        statusLabel = "Impedido";
        statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
        barColor = "bg-amber-500";
      } else if (completionRate >= 70) {
        statusLabel = "Saudável";
        statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        barColor = "bg-emerald-500";
      } else if (completionRate >= 30) {
        statusLabel = "Atenção";
        statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
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
    <div className="mx-auto max-w-7xl pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <LayoutDashboard className="text-indigo-500" /> Relatórios Operacionais
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Análise de produtividade, gargalos operacionais e entregas da equipe.</p>
        </div>
        
        {/* BARRA DE FILTROS AVANÇADA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto bg-zinc-900/80 p-2 rounded-xl border border-zinc-800 shadow-lg flex-wrap justify-end">
          
          {/* Filtro de Equipe */}
          <div className="flex items-center gap-2 px-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <Users size={14} className="text-zinc-400 ml-1" />
            <select 
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent text-sm text-white rounded pr-8 py-2 outline-none focus:ring-0 appearance-none min-w-[140px] cursor-pointer"
            >
              <option value="" className="bg-zinc-900">Todas as Equipes</option>
              {teams.map(team => (
                <option key={team.id} value={team.id} className="bg-zinc-900">{team.name}</option>
              ))}
            </select>
          </div>

          {/* Filtro de Pessoa */}
          <div className="flex items-center gap-2 px-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <User size={14} className="text-zinc-400 ml-1" />
            <select 
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="bg-transparent text-sm text-white rounded pr-8 py-2 outline-none focus:ring-0 appearance-none min-w-[140px] cursor-pointer"
            >
              <option value="" className="bg-zinc-900">Todos os Membros</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id} className="bg-zinc-900">
                  {profile.full_name || profile.email}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Mês */}
          <div className="flex items-center gap-2 px-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <Filter size={14} className="text-zinc-400 ml-1" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm text-white rounded px-1 py-1.5 outline-none min-w-[130px] cursor-pointer"
            />
          </div>

          {/* Botão de Limpar */}
          {(selectedMonth || selectedTeam || selectedUser) && (
            <button 
              onClick={() => { setSelectedMonth(""); setSelectedTeam(""); setSelectedUser(""); }} 
              className="text-xs font-bold text-zinc-400 hover:text-white px-3 py-2 bg-zinc-800 rounded-lg transition-colors border border-zinc-700 hover:border-zinc-500"
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
            
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col relative overflow-hidden">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <CheckCircle2 size={16} className="text-indigo-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider">Desempenho Global</h3>
              </div>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-white">{globalCompletionRate}%</span>
                <span className="text-xs text-zinc-500 font-medium mb-1.5">{globalCompletedTasks} de {globalTotalTasks}</span>
              </div>
              <div className="w-full h-1 bg-zinc-800 rounded-full mt-auto">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${globalCompletionRate}%` }}></div>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <AlertOctagon size={16} className={globalBlockedTasks > 0 ? "text-red-400" : "text-zinc-500"} />
                <h3 className="text-[11px] font-bold uppercase tracking-wider">Impedimentos / Gargalos</h3>
              </div>
              <span className={`text-3xl font-bold mt-1 ${globalBlockedTasks > 0 ? "text-red-400" : "text-white"}`}>
                {globalBlockedTasks}
              </span>
              <p className="text-[10px] text-zinc-500 mt-auto uppercase tracking-wide">Tarefas paradas aguardando ação</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Clock size={16} className="text-amber-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider">Horas Investidas</h3>
              </div>
              <span className="text-3xl font-bold text-white mt-1">{formatTime(globalTotalMinutes)}</span>
              <p className="text-[10px] text-zinc-500 mt-auto uppercase tracking-wide">Tempo logado na seleção</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                <DollarSign size={100} />
              </div>
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <DollarSign size={16} className="text-emerald-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider">Custo de Operação</h3>
              </div>
              <span className="text-3xl font-bold text-emerald-400 mt-1">{formatCurrency(globalTotalCost)}</span>
              <p className="text-[10px] text-zinc-500 mt-auto uppercase tracking-wide">Com base nas taxas cadastradas</p>
            </div>

          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden shadow-lg">
            <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40">
              <div>
                <h2 className="text-lg font-semibold text-white">Análise Detalhada por Projeto</h2>
                {(selectedMonth || selectedTeam || selectedUser) && (
                  <span className="text-xs text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 mt-1 inline-block">
                    Visualizando dados filtrados
                  </span>
                )}
              </div>
              <button 
                onClick={exportToExcel}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600/10 border border-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-500 hover:bg-emerald-600 hover:text-white transition-all shadow-sm w-full sm:w-auto"
              >
                <Download size={16} /> Exportar Excel
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-800/50 text-xs uppercase text-zinc-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Projeto</th>
                    <th className="px-6 py-4 font-semibold text-center">Progresso</th>
                    <th className="px-6 py-4 font-semibold text-center">Bloqueios</th>
                    <th className="px-6 py-4 font-semibold text-right">Tempo Logado</th>
                    <th className="px-6 py-4 font-semibold text-right">Custo Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 border border-dashed border-zinc-800 m-4 rounded-lg bg-zinc-900/20">
                        Nenhum dado encontrado para a combinação de filtros selecionada.
                      </td>
                    </tr>
                  ) : (
                    reportData.map((project) => (
                      <tr key={project.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-5">
                          <p className="font-bold text-white mb-1">{project.name}</p>
                          <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${project.statusColor}`}>
                            {project.statusLabel}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-white font-bold">{project.completionRate}%</span>
                            <div className="h-1.5 w-24 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                              <div className={`h-full rounded-full ${project.barColor} transition-all duration-500`} style={{ width: `${project.completionRate}%` }}></div>
                            </div>
                            <span className="text-[10px] text-zinc-500">{project.completedTasks} de {project.totalTasks} tarefas</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {project.blockedTasks > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-md text-xs font-bold">
                              <AlertOctagon size={12} /> {project.blockedTasks}
                            </span>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right font-medium text-amber-400/90">
                          {formatTime(project.totalMinutes)}
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-emerald-400">
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