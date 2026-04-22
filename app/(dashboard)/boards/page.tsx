"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { LayoutDashboard, MoreVertical, Edit2, Trash2, Archive, Play, CheckCircle2, List, LayoutGrid, AlertTriangle, Timer } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateBoardModal } from "@/components/CreateBoardModal";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

export default function DashboardPage() {
  const supabase = createClient();
  const [boards, setBoards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Alternar entre Cards (Grid) e Lista (Tabela)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Estados do Modal de Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState("active");

  const fetchBoards = useCallback(async () => {
    setIsLoading(true);
    // QUERY SÊNIOR: Trazendo os dados de Risco (Bloqueios e Tempo) para o painel principal
    const { data, error } = await supabase
      .from("boards")
      .select(`
        *,
        tasks (id, status, is_blocked, estimated_minutes, total_minutes_spent)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBoards(data);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // Ações de Deleção e Arquivamento
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`ATENÇÃO: Excluir o quadro "${name}" apagará TODAS as tarefas e o HISTÓRICO FINANCEIRO atrelado a ele. Deseja realmente excluir?`)) return;

    try {
      const { error } = await supabase.from("boards").delete().eq("id", id);
      if (error) throw error;
      toast.success("Quadro excluído permanentemente.");
      fetchBoards();
    } catch (error) {
      toast.error("Erro ao excluir o quadro.");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("boards").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      toast.success(newStatus === 'archived' ? "Quadro arquivado com segurança." : "Status atualizado.");
      fetchBoards();
    } catch (error) {
      toast.error("Erro ao atualizar o status.");
    }
  };

  // Ações do Modal de Edição
  const openEditModal = (board: any) => {
    setEditingBoard(board);
    setEditName(board.name);
    setEditDesc(board.description || "");
    setEditStatus(board.status || "active");
    setIsEditModalOpen(true);
  };

  const saveEdit = async () => {
    if (!editName.trim()) return toast.error("O nome do quadro é obrigatório.");
    
    try {
      const { error } = await supabase.from("boards").update({
        name: editName,
        description: editDesc,
        status: editStatus
      }).eq("id", editingBoard.id);

      if (error) throw error;
      
      toast.success("Configurações do quadro atualizadas!");
      setIsEditModalOpen(false);
      fetchBoards();
    } catch (error) {
      toast.error("Erro ao salvar edições.");
    }
  };

  // Componente Reutilizável de Menu de Ações
  const ActionMenu = ({ board }: { board: any }) => (
    <div className="relative group/menu">
      <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors">
        <MoreVertical size={16} />
      </button>
      <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-slate-200 bg-white shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 overflow-hidden">
        <button onClick={(e) => { e.preventDefault(); openEditModal(board); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
          <Edit2 size={14} /> Configurar Quadro
        </button>
        {board.status !== 'archived' ? (
          <button onClick={(e) => { e.preventDefault(); handleStatusChange(board.id, 'archived'); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Archive size={14} /> Arquivar Projeto
          </button>
        ) : (
          <button onClick={(e) => { e.preventDefault(); handleStatusChange(board.id, 'active'); }} className="w-full text-left px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">
            <Play size={14} /> Reativar Projeto
          </button>
        )}
        <button onClick={(e) => { e.preventDefault(); handleDelete(board.id, board.name); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100">
          <Trash2 size={14} /> Excluir Definitivo
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl pb-10 bg-slate-50">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Portfólio de Projetos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie seus quadros operacionais e monitore a saúde das entregas.
          </p>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-3">
          <div className="flex bg-slate-200/50 border border-slate-200 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              title="Visão em Cards"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              title="Visão em Tabela"
            >
              <List size={18} />
            </button>
          </div>
          
          <CreateBoardModal />
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL (Grid ou Tabela) */}
      {!isLoading && (!boards || boards.length === 0) ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center animate-in fade-in zoom-in duration-500">
          <LayoutDashboard className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">Nenhum quadro disponível</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            Seu espaço de trabalho está limpo. Comece criando o seu primeiro quadro de operação para gerenciar tarefas.
          </p>
          <div className="mt-6">
            <CreateBoardModal variant="outline" />
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          {/* MODO GRID (CARDS) */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {boards?.map((board) => {
                const totalTasks = board.tasks?.length || 0;
                const completedTasks = board.tasks?.filter((t: any) => t.status === 'done' || t.status === 'Feito' || t.status === 'concluído').length || 0;
                const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

                // BI do Projeto (Saúde e Custos)
                const blockedTasksCount = board.tasks?.filter((t: any) => t.is_blocked).length || 0;
                const totalEst = board.tasks?.reduce((acc: number, t: any) => acc + (t.estimated_minutes || 0), 0) || 0;
                const totalSpent = board.tasks?.reduce((acc: number, t: any) => acc + (t.total_minutes_spent || 0), 0) || 0;
                const isOverBudget = totalEst > 0 && totalSpent > totalEst;

                return (
                  <div
                    key={board.id}
                    className={`group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md ${board.status === 'archived' ? 'opacity-60 grayscale hover:grayscale-0' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <LayoutDashboard size={20} />
                          </div>
                          {board.status === 'active' && <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-100 uppercase tracking-widest">Ativo</span>}
                          {board.status === 'paused' && <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-100 uppercase tracking-widest">Pausado</span>}
                          {board.status === 'archived' && <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold border border-slate-200 uppercase tracking-widest">Arquivado</span>}
                        </div>
                        <ActionMenu board={board} />
                      </div>

                      <Link href={`/boards/${board.id}`} className="block mt-4 focus:outline-none">
                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {board.name}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500 line-clamp-2 min-h-[40px]">
                          {board.description || "Nenhuma descrição de escopo definida para este projeto."}
                        </p>

                        {/* Indicadores de Saúde do Projeto */}
                        <div className="flex gap-2 mt-3 min-h-[24px]">
                          {blockedTasksCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                              <AlertTriangle size={10} /> {blockedTasksCount} Bloqueio{blockedTasksCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {isOverBudget && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                              <Timer size={10} /> Horas Estouradas
                            </span>
                          )}
                        </div>
                      </Link>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className={progress === 100 ? "text-emerald-500" : "text-slate-400"}/> {completedTasks} de {totalTasks} tarefas</span>
                        <span className="font-bold">{progress}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-4">
                        <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-100 uppercase tracking-widest font-bold">
                        <span>Att {formatDistanceToNow(new Date(board.created_at), { addSuffix: true, locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODO TABELA (LISTA) */}
          {viewMode === "table" && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto min-h-[300px] custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-500">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold tracking-wider">Nome do Projeto</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Saúde da Operação</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Progresso</th>
                      <th className="px-6 py-4 font-bold tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {boards?.map((board) => {
                      const totalTasks = board.tasks?.length || 0;
                      const completedTasks = board.tasks?.filter((t: any) => t.status === 'done' || t.status === 'Feito' || t.status === 'concluído').length || 0;
                      const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

                      const blockedTasksCount = board.tasks?.filter((t: any) => t.is_blocked).length || 0;
                      const totalEst = board.tasks?.reduce((acc: number, t: any) => acc + (t.estimated_minutes || 0), 0) || 0;
                      const totalSpent = board.tasks?.reduce((acc: number, t: any) => acc + (t.total_minutes_spent || 0), 0) || 0;
                      const isOverBudget = totalEst > 0 && totalSpent > totalEst;

                      return (
                        <tr key={board.id} className={`hover:bg-slate-50 transition-colors ${board.status === 'archived' ? 'opacity-60' : ''}`}>
                          <td className="px-6 py-4">
                            <Link href={`/boards/${board.id}`} className="group block focus:outline-none">
                              <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{board.name}</p>
                              <p className="text-xs text-slate-400 mt-1 truncate max-w-xs">{board.description || "Sem descrição"}</p>
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            {board.status === 'active' && <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider border border-emerald-100">Ativo</span>}
                            {board.status === 'paused' && <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider border border-amber-100">Pausado</span>}
                            {board.status === 'archived' && <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider border border-slate-200">Arquivado</span>}
                          </td>
                          
                          {/* Coluna de Saúde */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5">
                              {blockedTasksCount > 0 ? (
                                <span className="inline-flex w-fit items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                                  <AlertTriangle size={10} /> {blockedTasksCount} Impedimento(s)
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sem Bloqueios</span>
                              )}
                              
                              {isOverBudget && (
                                <span className="inline-flex w-fit items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                                  <Timer size={10} /> Horas Estouradas
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4 min-w-[200px]">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                              <span>{completedTasks} / {totalTasks}</span>
                              <span className="font-bold">{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <ActionMenu board={board} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE QUADRO */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Edit2 size={20} className="text-indigo-400"/> Editar Quadro
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1 block">Nome do Quadro</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1 block">Objetivo / Escopo (Opcional)</label>
                <textarea 
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 resize-none min-h-[100px] transition-all"
                  placeholder="Descreva o objetivo geral deste quadro..."
                />
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1 block">Status Operacional</label>
                <select 
                  value={editStatus} 
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 cursor-pointer transition-all"
                >
                  <option value="active">🟢 Em Andamento (Ativo)</option>
                  <option value="paused">🟡 Pausado (Aguardando)</option>
                  <option value="archived">⚫ Arquivado (Concluído/Oculto)</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end border-t border-slate-100 pt-5">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={saveEdit}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}