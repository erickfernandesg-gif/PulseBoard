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
  const [profiles, setProfiles] = useState<any[]>([]);

  // Estados do Formulário do Modal
  const [title, setTitle] = useState("");
  const [triggerValue, setTriggerValue] = useState("done");
  const [actionType, setActionType] = useState("notify_manager");
  const [actionPayload, setActionPayload] = useState("");

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

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    if (data) setProfiles(data);
  }, [supabase]);

  useEffect(() => {
    fetchAutomations();
    fetchProfiles();
  }, [fetchAutomations]);

  // Função para criar nova automação
  const handleCreateAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Dê um título para a automação.");
    
    // Validação Sênior: Impede erro de cast de UUID no banco de dados
    if (actionType === "assign_auto" && !actionPayload) {
      return toast.error("Selecione um responsável para esta automação.");
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("automations").insert([{
        title,
        trigger_type: "status_change",
        trigger_value: triggerValue,
        action_type: actionType,
        action_payload: actionType === "assign_auto" ? actionPayload : null,
        is_active: true
      }]);

      if (error) throw error;
      
      toast.success("Automação criada com sucesso!");
      setIsModalOpen(false);
      
      // Reset form
      setTitle("");
      setTriggerValue("done");
      setActionType("notify_manager");
      setActionPayload("");
      
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
    const labels: any = { 
      "backlog": "Caixa de Entrada", "todo": "A Fazer", "in-progress": "Em Execução", 
      "homologation": "Homologação", "done": "Concluído", "task_blocked": "Tarefa for Bloqueada" 
    };
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bot className="text-indigo-500" />
            Construtor de Automações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
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
              className={`rounded-xl border bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all relative group shadow-sm ${
                auto.is_active ? "border-slate-200 hover:border-indigo-300" : "border-slate-100 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className={`flex shrink-0 h-12 w-12 items-center justify-center rounded-lg ${auto.is_active ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-slate-50 text-slate-400"}`}>
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${auto.is_active ? "text-slate-900" : "text-slate-500"}`}>
                    {auto.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-slate-500">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 tracking-wider border border-slate-200">SE</span>
                    <span className="text-xs">A tarefa for para <strong>{getTriggerLabel(auto.trigger_value)}</strong></span>
                    <ArrowRight size={14} className="text-slate-300 hidden sm:block mx-1" />
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 tracking-wider border border-indigo-100">ENTÃO</span>
                    <span className="text-xs"><strong>{getActionLabel(auto.action_type)}</strong></span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 self-end sm:self-auto mt-4 sm:mt-0">
                {/* Botão Excluir (Aparece no Hover) */}
                <button 
                  onClick={(e) => handleDelete(auto.id, e)}
                  className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Excluir Automação"
                >
                  <Trash2 size={18} />
                </button>

                {/* Switch / Toggle Button */}
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleAutomationStatus(auto.id, auto.is_active)}>
                  <span className={`flex h-6 w-11 items-center rounded-full p-1 transition-colors ${auto.is_active ? "bg-indigo-600" : "bg-slate-200"}`}>
                    <span className={`h-4 w-4 rounded-full bg-white transition-transform ${auto.is_active ? "translate-x-5" : "translate-x-0"}`}></span>
                  </span>
                  <span className={`text-xs font-bold w-12 ${auto.is_active ? "text-indigo-600" : "text-slate-400"}`}>
                    {auto.is_active ? "ATIVO" : "INATIVO"}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {automations.length === 0 && (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-white shadow-sm">
              <Bot size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-slate-900 font-bold mb-2">Nenhuma automação configurada</h3>
              <p className="text-slate-500 text-sm">Crie sua primeira regra para economizar tempo.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Zap className="text-indigo-500" size={20} /> Construir Lógica
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAutomation} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nome da Automação</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400" 
                  placeholder="Ex: Alerta de Conclusão"
                />
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">SE (Gatilho)</label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">Status mudar para</span>
                    <select 
                      value={triggerValue}
                      onChange={(e) => setTriggerValue(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 outline-none shadow-sm"
                    >
                      <option value="todo">A Fazer</option>
                      <option value="in-progress">Em Execução</option>
                      <option value="homologation">Homologação</option>
                      <option value="done">Concluído</option>
                      <option disabled className="text-slate-300">--- Impedimentos ---</option>
                      <option value="task_blocked">Tarefa for Bloqueada</option>
                    </select>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-200"></div>

                <div>
                  <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">ENTÃO (Ação)</label>
                  <select 
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 outline-none shadow-sm"
                  >
                    <option value="notify_manager">Notificar Diretoria / Gestor</option>
                    <option value="assign_auto">Atribuir a um responsável automaticamente</option>
                  </select>
                </div>

                {actionType === "assign_auto" && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Selecionar Responsável</label>
                    <select 
                      value={actionPayload}
                      onChange={(e) => setActionPayload(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 outline-none shadow-sm"
                    >
                      <option value="">Escolha um membro...</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-all">
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