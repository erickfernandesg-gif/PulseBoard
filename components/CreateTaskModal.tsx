"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, X, Loader2, Calendar as CalendarIcon, User, Clock, CalendarDays, Building2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function CreateTaskModal({
  boardId,
  profiles,
  onTaskCreated,
}: {
  boardId: string;
  profiles: any[];
  onTaskCreated: (task: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Estados Base
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("backlog"); // Status Padronizado
  const [priority, setPriority] = useState("medium");
  
  // Estados de Planejamento e Envolvidos
  const [assignedTo, setAssignedTo] = useState("");
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState("");
  
  // Datas e Estimativas
  const [startDate, setStartDate] = useState(""); 
  const [dueDate, setDueDate] = useState("");
  const [targetMonth, setTargetMonth] = useState(""); 
  const [estHours, setEstHours] = useState("");
  const [estMinutes, setEstMinutes] = useState("");

  // Busca os clientes quando o modal abre (UX Fluida)
  useEffect(() => {
    if (isOpen) {
      supabase.from("clients").select("id, name").order("name").then(({ data }) => {
        if (data) setClients(data);
      });
    }
  }, [isOpen, supabase]);

  const toggleCollaborator = (userId: string) => {
    setCollaborators(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Converte a estimativa para minutos totais para salvar no BD
    const totalEstMinutes = (parseInt(estHours) || 0) * 60 + (parseInt(estMinutes) || 0);

    try {
      // 1. Cria a Tarefa Principal
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert([{
          board_id: boardId,
          title,
          description,
          status,
          priority,
          assigned_to: assignedTo || null,
          client_id: clientId || null,
          start_date: startDate || null,
          due_date: dueDate || null,
          target_month: targetMonth || null,
          estimated_minutes: totalEstMinutes,
          total_minutes_spent: 0,
        }])
        .select("*, profiles(full_name, avatar_url)")
        .single();

      if (taskError) throw taskError;

      // 2. Associa os Colaboradores Extras (se houver)
      if (collaborators.length > 0) {
        const collData = collaborators.map(uid => ({ task_id: taskData.id, user_id: uid }));
        await supabase.from("task_collaborators").insert(collData);
      }

      toast.success("Demanda e estimativas registradas com sucesso!");
      onTaskCreated(taskData);
      
      // Fecha e Reseta
      setIsOpen(false);
      setTitle("");
      setDescription("");
      setStatus("backlog");
      setPriority("medium");
      setAssignedTo("");
      setCollaborators([]);
      setClientId("");
      setStartDate("");
      setDueDate("");
      setTargetMonth("");
      setEstHours("");
      setEstMinutes("");

    } catch (error: any) {
      toast.error("Falha ao criar tarefa: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-95"
      >
        <Plus className="mr-2 h-4 w-4" />
        Nova Demanda
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl my-8 animate-in fade-in zoom-in duration-200">
            
            <div className="flex items-center justify-between mb-8 border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Plus className="text-indigo-500" /> Registrar Nova Demanda
                </h2>
                <p className="text-sm text-zinc-400 mt-1">Configure o escopo, envolvidos e estimativa de esforço da atividade.</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              
              {/* GRID DE DUAS COLUNAS PARA VISÃO DE ERP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* COLUNA 1: ESCOPO E IDENTIFICAÇÃO */}
                <div className="space-y-5">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">1. Escopo</h3>
                  
                  <div>
                    <label htmlFor="title" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Título da Atividade *</label>
                    <input
                      type="text" id="title" required value={title} onChange={(e) => setTitle(e.target.value)}
                      className="block w-full rounded-xl border-0 bg-zinc-900 py-3 px-4 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-700"
                      placeholder="Ex: Ajuste no fluxo de homologação"
                    />
                  </div>

                  <div>
                    <label htmlFor="clientId" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Building2 size={12}/> Cliente Associado</label>
                    <select
                      id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)}
                      className="block w-full rounded-xl border-0 bg-zinc-900 py-3 px-4 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Operação Interna / Sem Cliente</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Descrição / Requisitos</label>
                    <textarea
                      id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
                      className="block w-full rounded-xl border-0 bg-zinc-900 py-3 px-4 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none placeholder:text-zinc-700"
                      placeholder="Detalhes técnicos, links ou requisitos do que deve ser feito..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="status" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Etapa Inicial</label>
                      <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="block w-full rounded-xl border-0 bg-zinc-900 py-3 px-4 text-xs font-bold text-indigo-400 ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                        <option value="backlog">Caixa de Entrada</option>
                        <option value="todo">Backlog (A Fazer)</option>
                        <option value="in-progress">Desenvolvimento</option>
                        <option value="homologation">Homologação</option>
                        <option value="production">Produção</option>
                        <option value="done">Concluído</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="targetMonth" className="block text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><CalendarDays size={12}/> Mês / Ciclo</label>
                      <input type="month" id="targetMonth" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} className="block w-full rounded-xl border-0 bg-emerald-500/10 py-3 px-4 text-xs text-emerald-400 font-bold ring-1 ring-inset ring-emerald-500/30 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer" />
                    </div>
                  </div>
                </div>

                {/* COLUNA 2: EQUIPE E TEMPO */}
                <div className="space-y-5">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">2. Planejamento</h3>
                  
                  {/* Estimativa de Tempo */}
                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
                    <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Clock size={12} /> Tempo Previsto (Orçamento de Horas)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative w-1/2">
                        <input type="number" min="0" placeholder="0" value={estHours} onChange={(e) => setEstHours(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-3 pr-8 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition-colors" />
                        <span className="absolute right-3 top-2.5 text-sm text-zinc-600 font-bold">h</span>
                      </div>
                      <div className="relative w-1/2">
                        <input type="number" min="0" max="59" placeholder="0" value={estMinutes} onChange={(e) => setEstMinutes(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-3 pr-8 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition-colors" />
                        <span className="absolute right-3 top-2.5 text-sm text-zinc-600 font-bold">m</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2">Usado para calcular a margem de lucro estimada.</p>
                  </div>

                  {/* Cronograma */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="startDate" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Início Previsto</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                        <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="block w-full rounded-xl border-0 bg-zinc-900 py-3 pl-10 pr-3 text-xs text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="dueDate" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Prazo de Entrega</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                        <input type="date" id="dueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="block w-full rounded-xl border-0 bg-zinc-900 py-3 pl-10 pr-3 text-xs text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Equipe */}
                  <div className="pt-2">
                    <label htmlFor="assignee" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Responsável Principal</label>
                    <div className="relative mt-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"><User className="h-4 w-4 text-zinc-500" /></div>
                      <select id="assignee" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="block w-full rounded-xl border-0 bg-zinc-900 py-3 pl-11 pr-10 text-sm text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer">
                        <option value="">Não atribuído</option>
                        {profiles.map((profile) => (<option key={profile.id} value={profile.id}>{profile.full_name || profile.email}</option>))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><UserPlus size={12} /> Colaboradores Extras</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/80 min-h-[60px] items-start">
                      {profiles.map(p => (
                        <button
                          key={p.id} type="button" onClick={() => toggleCollaborator(p.id)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                            collaborators.includes(p.id) ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-sm" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600"
                          }`}
                        >
                          {p.full_name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RODAPÉ DO MODAL */}
              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-zinc-800/80">
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl px-6 py-3 text-sm font-bold text-zinc-500 hover:bg-zinc-900 hover:text-white transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={isLoading || !title} className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition-all shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)] disabled:opacity-50 min-w-[180px]">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar e Continuar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}