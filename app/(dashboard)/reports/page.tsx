"use client";

import { useState, useEffect, useCallback } from "react";
import { Filter, Download, LayoutDashboard, TrendingUp, CheckCircle2, AlertCircle, Loader2, Users } from "lucide-react";
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
  
  // Filtros Ativos
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Busca paralela otimizada (Trazendo Tabelas, Tarefas, Equipes e Perfis)
      const [boardsRes, tasksRes, teamsRes, profilesRes] = await Promise.all([
        supabase.from("boards").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select("id, board_id, status, created_at, assigned_to"),
        supabase.from("teams").select("*").order("name"),
        supabase.from("profiles").select("id, team_id")
      ]);

      if (boardsRes.error) throw boardsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (teamsRes.error) throw teamsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setBoards(boardsRes.data || []);
      setTasks(tasksRes.data || []);
      setTeams(teamsRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error("Erro ao buscar dados do relatório:", error);
      toast.error("Erro ao carregar os relatórios.");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- MOTOR DE REGRAS BI (Com Cruzamento Relacional) ---
  const processReportData = () => {
    let filteredTasks = tasks;

    // 1. Aplica o Filtro de Mês
    if (selectedMonth) {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.created_at) return false;
        return task.created_at.substring(0, 7) === selectedMonth;
      });
    }

    // 2. Aplica o Filtro de Equipe (Cruzamento de Dados)
    if (selectedTeam) {
      // Descobre quais usuários pertencem à equipe selecionada
      const usersInThisTeam = profiles
        .filter(profile => profile.team_id === selectedTeam)
        .map(profile => profile.id);

      // Mantém apenas as tarefas que estão atribuídas a esses usuários
      filteredTasks = filteredTasks.filter(task => 
        task.assigned_to && usersInThisTeam.includes(task.assigned_to)
      );
    }

    const reportData = boards.map((board) => {
      const boardTasks = filteredTasks.filter((t) => t.board_id === board.id);
      const totalTasks = boardTasks.length;
      
      const completedTasks = boardTasks.filter((t) => t.status === "done" || t.status === "Feito" || t.status === "concluído").length;
      const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

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
        completionRate,
        statusLabel,
        statusColor,
        barColor,
      };
    });

    // UX: Se um filtro estiver ativo, ocultamos os projetos que ficaram vazios para limpar a tela
    if (selectedMonth || selectedTeam) {
      return reportData.filter(project => project.totalTasks > 0);
    }

    return reportData;
  };

  const reportData = processReportData();

  // --- MÉTRICAS GLOBAIS ---
  const globalTotalTasks = reportData.reduce((acc, curr) => acc + curr.totalTasks, 0);
  const globalCompletedTasks = reportData.reduce((acc, curr) => acc + curr.completedTasks, 0);
  const globalCompletionRate = globalTotalTasks === 0 ? 0 : Math.round((globalCompletedTasks / globalTotalTasks) * 100);
  const projectsAtRisk = reportData.filter(r => r.statusLabel === "Crítico").length;

  // --- EXPORTAÇÃO EXCEL DINÂMICA ---
  const exportToExcel = () => {
    try {
      if (reportData.length === 0) return toast.info("Não há dados para exportar com estes filtros.");

      const excelData = reportData.map(row => ({
        "Nome do Projeto": row.name,
        "Total de Tarefas": row.totalTasks,
        "Tarefas Concluídas": row.completedTasks,
        "Taxa de Conclusão (%)": `${row.completionRate}%`,
        "Status da Operação": row.statusLabel
      }));

      excelData.push({
        "Nome do Projeto": "TOTAL GERAL DA SELEÇÃO",
        "Total de Tarefas": globalTotalTasks,
        "Tarefas Concluídas": globalCompletedTasks,
        "Taxa de Conclusão (%)": `${globalCompletionRate}%`,
        "Status da Operação": projectsAtRisk > 0 ? "ATENÇÃO" : "SAUDÁVEL"
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 22 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Visão Operacional");

      // Constrói o nome do arquivo baseado nos filtros escolhidos
      let teamNameForFile = "Geral";
      if (selectedTeam) {
        const t = teams.find(t => t.id === selectedTeam);
        if (t) teamNameForFile = t.name.replace(/[^a-zA-Z0-9]/g, "_"); // Remove espaços/caracteres especiais
      }
      
      const monthForFile = selectedMonth ? `_${selectedMonth}` : "";
      const fileName = `Relatorio_PulseBoard_${teamNameForFile}${monthForFile}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      toast.success("Excel gerado com sucesso!");
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
          <p className="text-sm text-zinc-400 mt-1">Visão macro da saúde e progresso da operação.</p>
        </div>
        
        {/* BARRA DE FILTROS AVANÇADA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto bg-zinc-900/80 p-2 rounded-xl border border-zinc-800 shadow-lg">
          
          {/* Filtro de Equipe */}
          <div className="flex items-center gap-2 px-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <Users size={14} className="text-zinc-400 ml-1" />
            <select 
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent text-sm text-white rounded pr-8 py-2 outline-none focus:ring-0 appearance-none min-w-[140px]"
            >
              <option value="" className="bg-zinc-900">Todas as Equipes</option>
              {teams.map(team => (
                <option key={team.id} value={team.id} className="bg-zinc-900">{team.name}</option>
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
              className="bg-transparent text-sm text-white rounded px-1 py-1.5 outline-none min-w-[130px]"
            />
          </div>

          {/* Botão de Limpar (Só aparece se houver filtro) */}
          {(selectedMonth || selectedTeam) && (
            <button 
              onClick={() => { setSelectedMonth(""); setSelectedTeam(""); }} 
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <TrendingUp size={16} className="text-indigo-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">Volume Total (Tarefas)</h3>
              </div>
              <span className="text-3xl font-bold text-white">{globalTotalTasks}</span>
              <p className="text-xs text-zinc-500 mt-2">No período/equipe selecionada</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">Taxa de Conclusão</h3>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">{globalCompletionRate}%</span>
                <span className="text-sm text-emerald-400 font-medium mb-1">({globalCompletedTasks} entregues)</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${globalCompletionRate}%` }}></div>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <AlertCircle size={16} className={projectsAtRisk > 0 ? "text-red-400" : "text-zinc-500"} />
                <h3 className="text-sm font-semibold uppercase tracking-wider">Projetos em Risco</h3>
              </div>
              <span className={`text-3xl font-bold ${projectsAtRisk > 0 ? "text-red-400" : "text-white"}`}>
                {projectsAtRisk}
              </span>
              <p className="text-xs text-zinc-500 mt-2">Projetos com taxa de conclusão crítica</p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden shadow-lg">
            <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40">
              <div>
                <h2 className="text-lg font-semibold text-white">Desempenho por Projeto</h2>
                {(selectedMonth || selectedTeam) && (
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
                    <th className="px-6 py-4 font-semibold text-center">Total de Tarefas</th>
                    <th className="px-6 py-4 font-semibold text-center">Tarefas Concluídas</th>
                    <th className="px-6 py-4 font-semibold">Progresso (Taxa)</th>
                    <th className="px-6 py-4 font-semibold">Status Operacional</th>
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
                        <td className="px-6 py-5 font-bold text-white">{project.name}</td>
                        <td className="px-6 py-5 text-center text-zinc-300">{project.totalTasks}</td>
                        <td className="px-6 py-5 text-center text-emerald-400 font-medium">{project.completedTasks}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-32 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                              <div 
                                className={`h-full rounded-full ${project.barColor} transition-all duration-500`} 
                                style={{ width: `${project.completionRate}%` }}
                              ></div>
                            </div>
                            <span className="text-zinc-300 font-bold min-w-[3ch]">{project.completionRate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wider shadow-sm ${project.statusColor}`}>
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
        </>
      )}
    </div>
  );
}