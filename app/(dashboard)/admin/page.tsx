"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Shield, Plus, Edit2, Trash2, Building2, Loader2, DollarSign, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"users" | "teams">("users");
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Estados de Dados
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [userRates, setUserRates] = useState<any[]>([]);

  // Estados dos Modais
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Formulário de Equipe
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");

  // Formulário de Usuário
  const [userRole, setUserRole] = useState("user");
  const [userTeamId, setUserTeamId] = useState("");
  const [userHourlyRate, setUserHourlyRate] = useState<number | string>("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    
    // Verificação de Segurança (Frontend)
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return router.push("/login");

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'manager') {
      setAccessDenied(true);
      setIsLoading(false);
      return;
    }

    // Se passou, busca os dados da administração
    const [profRes, teamsRes, ratesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, role, team_id").order("full_name"),
      supabase.from("teams").select("*").order("name"),
      supabase.from("user_rates").select("*")
    ]);

    if (profRes.data) setUsers(profRes.data);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (ratesRes.data) setUserRates(ratesRes.data);
    
    setIsLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Funções de Equipes (Teams) ---

  const openTeamModal = (team: any = null) => {
    if (team) {
      setEditingTeam(team);
      setTeamName(team.name);
      setTeamDescription(team.description || "");
    } else {
      setEditingTeam(null);
      setTeamName("");
      setTeamDescription("");
    }
    setIsTeamModalOpen(true);
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) return toast.error("O nome da equipe é obrigatório.");

    try {
      if (editingTeam) {
        const { error } = await supabase.from("teams").update({
          name: teamName,
          description: teamDescription
        }).eq("id", editingTeam.id);
        if (error) throw error;
        toast.success("Equipe atualizada!");
      } else {
        const { error } = await supabase.from("teams").insert({
          name: teamName,
          description: teamDescription
        });
        if (error) throw error;
        toast.success("Equipe criada!");
      }
      setIsTeamModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Erro ao salvar equipe.");
      console.error(error);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!window.confirm("Atenção! Excluir a equipe removerá o vínculo com os usuários atuais. Deseja continuar?")) return;
    
    try {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw error;
      toast.success("Equipe excluída!");
      fetchData();
    } catch (error: any) {
      toast.error("Erro ao excluir equipe.");
    }
  };

  // --- Funções de Usuários ---

  const openUserModal = (user: any) => {
    const rate = userRates.find(r => r.user_id === user.id)?.hourly_rate || 0;
    setEditingUser(user);
    setUserRole(user.role || "user");
    setUserTeamId(user.team_id || "");
    setUserHourlyRate(rate);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      // 1. Atualiza o perfil (Role e Equipe)
      const { error: profileError } = await supabase.from("profiles").update({
        role: userRole,
        team_id: userTeamId || null
      }).eq("id", editingUser.id);
      
      if (profileError) throw profileError;

      // 2. Atualiza a taxa financeira
      const numericRate = Number(userHourlyRate);
      if (isNaN(numericRate) || numericRate < 0) {
          throw new Error("Valor financeiro inválido");
      }

      const { error: rateError } = await supabase.from("user_rates").upsert({
        user_id: editingUser.id,
        hourly_rate: numericRate
      }, { onConflict: 'user_id' });

      if (rateError) throw rateError;

      toast.success("Configurações do usuário salvas!");
      setIsUserModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Erro ao salvar dados do usuário.");
      console.error(error);
    }
  };

  // Bloqueio de tela cheia se for acesso indevido
  if (accessDenied) {
    return (
      <div className="mx-auto max-w-7xl flex flex-col items-center justify-center min-h-[60vh]">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white">Acesso Restrito</h2>
        <p className="text-zinc-400 mt-2">Você não tem permissão para visualizar o painel de governança.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="text-indigo-500" />
            Administração e Configurações
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Governança corporativa, gestão de equipes e controle financeiro (RH).
          </p>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-zinc-800 mb-6">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "users" ? "border-indigo-500 text-indigo-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-2"><Users size={16} /> Usuários do Sistema</div>
        </button>
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "teams" ? "border-indigo-500 text-indigo-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-2"><Building2 size={16} /> Gestão de Equipes</div>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
      ) : (
        <>
          {/* CONTEÚDO DA ABA DE USUÁRIOS */}
          {activeTab === "users" && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Equipe Registrada</h2>
                <span className="text-sm text-zinc-500">{users.length} membros ativos</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="bg-zinc-800/50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-6 py-3">Colaborador</th>
                      <th className="px-6 py-3">Departamento</th>
                      <th className="px-6 py-3">Nível de Acesso</th>
                      <th className="px-6 py-3 text-right">Valor Custo/Hora</th>
                      <th className="px-6 py-3 text-right">Configurar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {users.map((user) => {
                      const userTeam = teams.find(t => t.id === user.team_id);
                      const userRate = userRates.find(r => r.user_id === user.id)?.hourly_rate || 0;
                      
                      return (
                        <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase border border-indigo-500/50">
                                {user.full_name?.substring(0, 2) || "U"}
                              </div>
                              <p className="font-medium text-white">{user.full_name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-300">
                            {userTeam ? userTeam.name : <span className="text-zinc-600 italic">Sem departamento</span>}
                          </td>
                          <td className="px-6 py-4">
                            {user.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                                <Shield size={12} /> Admin
                              </span>
                            ) : user.role === 'manager' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
                                <Shield size={12} /> Gestor
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300 border border-zinc-700">
                                <Users size={12} /> Usuário
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-emerald-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(userRate))}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => openUserModal(user)}
                              className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors inline-block"
                            >
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTEÚDO DA ABA DE EQUIPES */}
          {activeTab === "teams" && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Departamentos Corporativos</h2>
                <button 
                  onClick={() => openTeamModal()}
                  className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                >
                  <Plus size={16} /> Novo Departamento
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="bg-zinc-800/50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-6 py-3">Nome da Equipe</th>
                      <th className="px-6 py-3">Descrição / Foco</th>
                      <th className="px-6 py-3 text-right">Controles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {teams.map((team) => (
                      <tr key={team.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">{team.name}</td>
                        <td className="px-6 py-4 text-zinc-400">{team.description || "-"}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => openTeamModal(team)}
                            className="p-2 text-zinc-500 hover:text-indigo-400 transition-colors inline-block bg-zinc-800/50 rounded mr-2"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteTeam(team.id)}
                            className="p-2 text-zinc-500 hover:text-red-400 transition-colors inline-block bg-zinc-800/50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {teams.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-zinc-500 border border-dashed border-zinc-800 m-4 rounded-lg">
                          Nenhuma equipe estruturada. <br/> Crie departamentos para organizar as permissões.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL DE EDIÇÃO DE USUÁRIO */}
      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setIsUserModalOpen(false)} />
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Configurar Colaborador</h3>
            <p className="text-sm font-medium text-indigo-400 mb-6 border-b border-zinc-800 pb-4">
              {editingUser.full_name}
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Nível de Acesso no Sistema</label>
                <select 
                  value={userRole} 
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="user">Usuário Padrão (Colaborador)</option>
                  <option value="manager">Gestor de Projetos</option>
                  <option value="admin">Administrador Geral</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Lotação / Departamento</label>
                <select 
                  value={userTeamId} 
                  onChange={(e) => setUserTeamId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="">Independente (Nenhum)</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 mt-2 border-t border-zinc-800/80">
                <label className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-2 mb-2">
                  <DollarSign size={14} /> Custo por Hora (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">R$</span>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={userHourlyRate}
                    onChange={(e) => setUserHourlyRate(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-12 pr-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                  <p className="text-[10px] text-emerald-400 leading-tight">
                    * Confidencial. Este valor é utilizado pelo algoritmo de Business Intelligence 
                    para calcular a queima de caixa (Burn Rate) nos dashboards executivos.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end border-t border-zinc-800 pt-6">
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveUser}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
              >
                Aplicar Regras
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EQUIPE */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setIsTeamModalOpen(false)} />
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Building2 className="text-indigo-500" size={20}/>
              {editingTeam ? "Editar Departamento" : "Novo Departamento"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Nome Oficial</label>
                <input 
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ex: Engenharia de Software"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Escopo de Trabalho (Opcional)</label>
                <textarea 
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Descreva as responsabilidades foco deste grupo..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 resize-none min-h-[100px]"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end border-t border-zinc-800 pt-6">
              <button 
                onClick={() => setIsTeamModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveTeam}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
              >
                {editingTeam ? "Atualizar" : "Salvar Departamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}