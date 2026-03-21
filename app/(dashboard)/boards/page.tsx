"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { LayoutDashboard, MoreVertical, Edit2, Trash2, Archive, Play, CheckCircle2, List, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateBoardModal } from "@/components/CreateBoardModal";
import { toast } from "sonner";

export default function DashboardPage() {
  const supabase = createClient();
  const [boards, setBoards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Nova funcionalidade: Alternar entre Cards (Grid) e Lista (Tabela)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Estados do Modal de Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState("active");

  const fetchBoards = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("boards")
      .select(`
        *,
        tasks (id, status)
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

  // Componente Reutilizável de Menu de Ações (para funcionar tanto no Grid quanto na Tabela)
  const ActionMenu = ({ board }: { board: any }) => (
    <div className="relative group/menu">
      <button className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-md hover:bg-zinc-800 transition-colors">
        <MoreVertical size={16} />
      </button>
      <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 overflow-hidden">
        <button onClick={(e) => { e.preventDefault(); openEditModal(board); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 flex items-center gap-2">
          <Edit2 size={14} /> Configurar Quadro
        </button>
        {board.status !== 'archived' ? (
          <button onClick={(e) => { e.preventDefault(); handleStatusChange(board.id, 'archived'); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 flex items-center gap-2">
            <Archive size={14} /> Arquivar Projeto
          </button>
        ) : (
          <button onClick={(e) => { e.preventDefault(); handleStatusChange(board.id, 'active'); }} className="w-full text-left px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2">
            <Play size={14} /> Reativar Projeto
          </button>
        )}
        <button onClick={(e) => { e.preventDefault(); handleDelete(board.id, board.name); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-zinc-800/50">
          <Trash2 size={14} /> Excluir Definitivo
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Portfólio de Projetos
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gerencie seus quadros operacionais, status e progresso.
          </p>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-3">
          {/* Alternador de Visualização (Grid / Tabela) */}
          <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Visão em Cards"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 py-16 text-center">
          <LayoutDashboard className="mx-auto h-12 w-12 text-zinc-600" />
          <h3 className="mt-4 text-base font-semibold text-white">Nenhum quadro disponível</h3>
          <p className="mt-1 text-sm text-zinc-400 max-w-sm mx-auto">
            Seu espaço de trabalho está limpo. Comece criando o seu primeiro quadro de operação para gerenciar tarefas.
          </p>
          <div className="mt-6">
            <CreateBoardModal variant="outline" />
          </div>
        </div>
      ) : (
        <>
          {/* MODO GRID (CARDS) */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {boards?.map((board) => {
                const totalTasks = board.tasks?.length || 0;
                const completedTasks = board.tasks?.filter((t: any) => t.status === 'done').length || 0;
                const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

                return (
                  <div
                    key={board.id}
                    className={`group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm transition-all hover:border-indigo-500/50 hover:bg-zinc-800/80 ${board.status === 'archived' ? 'opacity-60 grayscale hover:grayscale-0' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                            <LayoutDashboard size={20} />
                          </div>
                          {board.status === 'active' && <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">Em Andamento</span>}
                          {board.status === 'paused' && <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-500/20">Pausado</span>}
                          {board.status === 'archived' && <span className="bg-zinc-700/50 text-zinc-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-zinc-600">Arquivado</span>}
                        </div>
                        <ActionMenu board={board} />
                      </div>

                      <Link href={`/boards/${board.id}`} className="block mt-4 focus:outline-none">
                        <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                          {board.name}
                        </h3>
                        <p className="mt-2 text-sm text-zinc-400 line-clamp-2 min-h-[40px]">
                          {board.description || "Nenhuma descrição de escopo definida para este projeto."}
                        </p>
                      </Link>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                        <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className={progress === 100 ? "text-emerald-500" : "text-zinc-500"}/> {completedTasks} de {totalTasks} tarefas</span>
                        <span className="font-bold">{progress}%</span>
                      </div>
                      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-4">
                        <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800/50">
                        <span>Atualizado {formatDistanceToNow(new Date(board.created_at), { addSuffix: true, locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODO TABELA (LISTA) */}
          {viewMode === "table" && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-sm overflow-hidden">
              <div className="overflow-x-auto min-h-[300px] custom-scrollbar">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="bg-zinc-800/50 text-xs uppercase text-zinc-500 border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4 font-bold tracking-wider">Nome do Projeto</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Progresso de Tarefas</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Última Atualização</th>
                      <th className="px-6 py-4 font-bold tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {boards?.map((board) => {
                      const totalTasks = board.tasks?.length || 0;
                      const completedTasks = board.tasks?.filter((t: any) => t.status === 'done').length || 0;
                      const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

                      return (
                        <tr key={board.id} className={`hover:bg-zinc-800/30 transition-colors ${board.status === 'archived' ? 'opacity-60' : ''}`}>
                          <td className="px-6 py-4">
                            <Link href={`/boards/${board.id}`} className="group block focus:outline-none">
                              <p className="font-medium text-white group-hover:text-indigo-400 transition-colors">{board.name}</p>
                              <p className="text-xs text-zinc-500 mt-1 truncate max-w-xs">{board.description || "Sem descrição"}</p>
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            {board.status === 'active' && <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-md font-medium border border-emerald-500/20">Em Andamento</span>}
                            {board.status === 'paused' && <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded-md font-medium border border-amber-500/20">Pausado</span>}
                            {board.status === 'archived' && <span className="inline-flex items-center gap-1.5 bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-md font-medium border border-zinc-700">Arquivado</span>}
                          </td>
                          <td className="px-6 py-4 min-w-[200px]">
                            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                              <span>{completedTasks} / {totalTasks}</span>
                              <span className="font-bold">{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-500">
                            {formatDistanceToNow(new Date(board.created_at), { addSuffix: true, locale: ptBR })}
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
        </>
      )}

      {/* MODAL DE EDIÇÃO DE QUADRO */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Edit2 size={20} className="text-indigo-400"/> Editar Quadro
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Nome do Quadro</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Objetivo / Escopo (Opcional)</label>
                <textarea 
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-indigo-500 resize-none min-h-[80px]"
                  placeholder="Descreva o objetivo geral deste quadro..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Status</label>
                <select 
                  value={editStatus} 
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="active">🟢 Em Andamento (Ativo)</option>
                  <option value="paused">🟡 Pausado (Aguardando)</option>
                  <option value="archived">⚫ Arquivado (Concluído/Oculto)</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={saveEdit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors"
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