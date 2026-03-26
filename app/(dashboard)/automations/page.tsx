"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Plus, ArrowRight, Loader2, X, Trash2, Bot } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export default function AutomationsPage() {
  const supabase = createClient();
  
  // Estados Principais
  const [automations, setAutomations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados do Formulário do Modal
  const [title, setTitle] = useState("");
  const [triggerValue, setTriggerValue] = useState("done");
  const [actionType, setActionType] = useState("notify_manager");

  const fetchAutomations = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("automations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao buscar automações");
      console.error(error);
    } else {
      setAutomations(data || []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  // Função para criar nova automação
  const handleCreateAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Dê um título para a automação.");

    setIsSaving(true);
    try {
      const { error } = await supabase.from("automations").insert([{
        title,
        trigger_type: "status_change",
        trigger_value: triggerValue,
        action_type: actionType,
        is_active: true
      }]);

      if (error) throw error;
      
      toast.success("Automação criada com sucesso!");
      setIsModalOpen(false);
      
      // Reset form
      setTitle("");
      setTriggerValue("done");
      setActionType("notify_manager");
      
      fetchAutomations();
    } catch (error: any) {
      toast.error("Erro ao salvar automação.");
    } finally {
      setIsSaving(false);
    }
  };

  // Função para ativar/desativar o Toggle (Switch)
  const toggleAutomationStatus = async (id: string, currentStatus: boolean) => {
    // Atualização Otimista na UI
    setAutomations(prev => prev.map(auto => 
      auto.id === id ? { ...auto, is_active: !currentStatus } : auto
    ));

    const { error } = await supabase
      .from("automations")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Falha ao alterar status.");
      fetchAutomations(); // Reverte se der erro
    }
  };

  // Função para excluir automação
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Deseja excluir esta regra de automação?")) return;

    const { error } = await supabase.from("automations").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir.");
    } else {
      toast.success("Automação removida.");
      fetchAutomations();
    }
  };

  // Funções auxiliares para renderizar texto amigável
  const getTriggerLabel = (value: string) => {
    const labels: any = { "backlog": "Caixa de Entrada", "todo": "A Fazer", "in-progress": "Em Execução", "homologation": "Homologação", "done": "Concluído" };
    return labels[value] || value;
  };

  const getActionLabel = (type: string) => {
    const labels: any = { "notify_manager": "Notificar Gestor/Diretor", "assign_auto": "Atribuir Automático" };
    return labels[type] || type;
  };

  return (
    <div className="mx-auto max-w-7xl pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="text-indigo-500" />
            Construtor de Automações
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Reduza o trabalho braçal criando regras lógicas (SE / ENTÃO).
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)] w-full sm:w-auto justify-center"
        >
          <Plus size={16} />
          Nova Automação
        </button>
      </div>

      {/* Lista de Automações */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {automations.map((auto) => (
            <div 
              key={auto.id} 
              className={`rounded-xl border bg-zinc-900/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all relative group ${
                auto.is_active ? "border-zinc-700 hover:border-indigo-500/50" : "border-zinc-800 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className={`flex shrink-0 h-12 w-12 items-center justify-center rounded-lg ${auto.is_active ? "bg-indigo-500/10 text-indigo-400" : "bg-zinc-800 text-zinc-500"}`}>
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${auto.is_active ? "text-white" : "text-zinc-400"}`}>
                    {auto.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-zinc-400">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300 tracking-wider">SE</span>
                    <span className="text-xs">A tarefa for para <strong>{getTriggerLabel(auto.trigger_value)}</strong></span>
                    <ArrowRight size={14} className="text-zinc-600 hidden sm:block mx-1" />
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400 tracking-wider">ENTÃO</span>
                    <span className="text-xs"><strong>{getActionLabel(auto.action_type)}</strong></span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 self-end sm:self-auto mt-4 sm:mt-0">
                {/* Botão Excluir (Aparece no Hover) */}
                <button 
                  onClick={(e) => handleDelete(auto.id, e)}
                  className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Excluir Automação"
                >
                  <Trash2 size={18} />
                </button>

                {/* Switch / Toggle Button */}
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleAutomationStatus(auto.id, auto.is_active)}>
                  <span className={`flex h-6 w-11 items-center rounded-full p-1 transition-colors ${auto.is_active ? "bg-indigo-600" : "bg-zinc-700"}`}>
                    <span className={`h-4 w-4 rounded-full bg-white transition-transform ${auto.is_active ? "translate-x-5" : "translate-x-0"}`}></span>
                  </span>
                  <span className={`text-xs font-bold w-12 ${auto.is_active ? "text-indigo-400" : "text-zinc-500"}`}>
                    {auto.is_active ? "ATIVO" : "INATIVO"}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {automations.length === 0 && (
            <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
              <Bot size={48} className="mx-auto text-zinc-700 mb-4" />
              <h3 className="text-white font-bold mb-2">Nenhuma automação configurada</h3>
              <p className="text-zinc-500 text-sm">Crie sua primeira regra para economizar tempo.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Zap className="text-indigo-500" size={20} /> Construir Lógica
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAutomation} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Nome da Automação</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-zinc-700" 
                  placeholder="Ex: Alerta de Conclusão"
                />
              </div>

              <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800/80 space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">SE (Gatilho)</label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">Status mudar para</span>
                    <select 
                      value={triggerValue}
                      onChange={(e) => setTriggerValue(e.target.value)}
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                    >
                      <option value="todo">A Fazer</option>
                      <option value="in-progress">Em Execução</option>
                      <option value="homologation">Homologação</option>
                      <option value="done">Concluído</option>
                    </select>
                  </div>
                </div>

                <div className="h-px w-full bg-zinc-800/80"></div>

                <div>
                  <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">ENTÃO (Ação)</label>
                  <select 
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="notify_manager">Notificar Diretoria / Gestor</option>
                    <option value="assign_auto">Atribuir a um responsável automaticamente</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-6 py-2.5 text-sm font-bold text-zinc-500 hover:text-white transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition-all disabled:opacity-50">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Ativar Regra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}