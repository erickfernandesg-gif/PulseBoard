"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, MessageSquare, Calendar, Save, Loader2, Trash2, Clock, Plus, UserPlus, Zap, CalendarDays, AlertOctagon, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { FullTaskData } from "./KanbanTask"; // Import the shared Task type

// --- Definições de Tipos para Robustez (Melhoria Sênior) ---
interface Profile {
  id: string;
  full_name: string;
  // Adicione outros campos do perfil se necessário
}

interface Client {
  id: string;
  name: string;
}

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: Pick<Profile, 'full_name'> | null;
}

interface TimeLog {
  id: string;
  task_id: string;
  user_id: string;
  minutes: number;
  description: string | null;
  log_date: string;
  profiles: Pick<Profile, 'full_name'> | null;
}

type Task = FullTaskData; // Use the unified Task type

interface TaskDetailsModalProps {
  task: Task;
  onClose: () => void;
  onTaskUpdated?: () => void;
  onTaskDeleted?: (taskId: string) => void;
}

export function TaskDetailsModal({
  task: initialTask, // Renomeado para evitar conflito com o estado 'task'
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailsModalProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [isSaving, setIsSaving] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [collaborators, setCollaborators] = useState<string[]>([]); // Armazena apenas IDs
  
  // Referência para o Auto-scroll do Chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Estados de Clientes
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(initialTask.client_id || "");

  // Estados de Apontamento de Horas (ATUALIZADO PARA H E M)
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [inputHours, setInputHours] = useState("");
  const [inputMinutes, setInputMinutes] = useState("");
  const [timeDescription, setTimeDescription] = useState("");
  const [isSubmittingTime, setIsSubmittingTime] = useState(false);

  // Estados dos campos editáveis da Tarefa
  const [title, setTitle] = useState(initialTask.title);
  const [description, setDescription] = useState(initialTask.description || "");
  const [startDate, setStartDate] = useState(initialTask.start_date ? initialTask.start_date.split("T")[0] : "");
  const [dueDate, setDueDate] = useState(initialTask.due_date ? initialTask.due_date.split("T")[0] : "");
  const [assignedTo, setAssignedTo] = useState(initialTask.assigned_to || "");
  const [status, setStatus] = useState(initialTask.status);
  
  // Estados de Bloqueio e Mês
  const [isBlocked, setIsBlocked] = useState(initialTask.is_blocked || false);
  const [blockerReason, setBlockerReason] = useState(initialTask.blocker_reason || "");
  const [targetMonth, setTargetMonth] = useState(initialTask.target_month || "");

  // Função para formatar minutos em Horas e Minutos (ex: 150m -> 2h 30m)
  const formatMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const totalTimeSpent = timeLogs.reduce((acc, log) => acc + log.minutes, 0);

  // Carregar dados iniciais
  const fetchData = useCallback(async () => {
    const [profRes, commRes, collRes, timeRes, clientsRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name"),
      supabase.from("task_comments")
        .select("id, task_id, user_id, content, created_at, profiles(full_name)") // Seleção explícita
        .eq("task_id", initialTask.id)
        .order("created_at", { ascending: false }),
      supabase.from("task_collaborators")
        .select("user_id, profiles(full_name)")
        .eq("task_id", initialTask.id),
      supabase.from("time_logs")
        .select("*, profiles(full_name)")
        .eq("task_id", initialTask.id)
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name").order("name") // Busca os Clientes
    ]);

    if (profRes.data) setProfiles(profRes.data);
    if (commRes.data) {
      // Tratamento Sênior: Garante que 'profiles' seja um objeto e não um array (comum em joins do Supabase)
      const formatted = (commRes.data as any[]).map(c => ({
        ...c,
        profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
      }));
      setComments(formatted as unknown as Comment[]);
    }
    if (collRes.data) setCollaborators(collRes.data.map(c => c.user_id) as string[]);
    if (timeRes.data) {
      const formatted = (timeRes.data as any[]).map(t => ({
        ...t,
        profiles: Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
      }));
      setTimeLogs(formatted as unknown as TimeLog[]);
    }
    if (clientsRes.data) setClients(clientsRes.data);
  }, [supabase, initialTask.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // UX de Sênior: Auto-scroll no chat quando abrir a aba ou chegar mensagem nova
  useEffect(() => {
    if (activeTab === "activity") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments, activeTab]);

  const handleDelete = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir a tarefa "${initialTask.title}"? O histórico será perdido.`)) return;

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", initialTask.id);
      if (error) throw error;

      toast.success("Tarefa excluída com sucesso");
      if (onTaskDeleted) onTaskDeleted(initialTask.id);
      onClose();
    } catch (error: any) {
      toast.error("Erro ao excluir a tarefa");
      console.error(error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error: taskError } = await supabase
        .from("tasks")
        .update({
          title,
          description,
          start_date: startDate || null,
          due_date: dueDate || null,
          assigned_to: assignedTo || null,
          client_id: clientId || null, // Salva o vínculo do Cliente
          status,
          target_month: targetMonth || null,
          is_blocked: isBlocked,
          blocker_reason: isBlocked ? blockerReason : null,
        })
        .eq("id", initialTask.id);

      if (taskError) throw taskError;

      await supabase.from("task_collaborators").delete().eq("task_id", initialTask.id);
      if (collaborators.length > 0) {
        const collData = collaborators.map(uid => ({ task_id: initialTask.id, user_id: uid }));
        await supabase.from("task_collaborators").insert(collData);
      }

      toast.success("Alterações salvas no PulseBoard");
      if (onTaskUpdated) onTaskUpdated();
      onClose();
    } catch (error: any) {
      toast.error("Erro ao sincronizar dados");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("task_comments").insert({
      task_id: initialTask.id,
      user_id: user.id,
      content: newComment
    });

    if (!error) {
      setNewComment("");
      fetchData();
    }
  };

  const toggleCollaborator = (userId: string) => {
    setCollaborators(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Lógica OTIMIZADA para salvar horas e minutos
  const handleAddTimeLog = async () => {
    const hrs = parseInt(inputHours) || 0;
    const mins = parseInt(inputMinutes) || 0;
    const totalMinutesToSave = (hrs * 60) + mins;

    if (totalMinutesToSave <= 0) {
      toast.error("Insira uma quantidade válida de tempo.");
      return;
    }
    
    setIsSubmittingTime(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado.");
      setIsSubmittingTime(false);
      return;
    }

    const { error } = await supabase.from("time_logs").insert({
      task_id: initialTask.id,
      user_id: user.id,
      minutes: totalMinutesToSave, // O BD salva em minutos totais para os relatórios funcionarem
      description: timeDescription,
      log_date: new Date().toISOString().split('T')[0]
    });

    if (error) {
      toast.error("Erro ao registrar horas. Verifique as permissões.");
      console.error(error);
    } else {
      toast.success("Tempo registrado com sucesso!");
      setInputHours("");
      setInputMinutes("");
      setTimeDescription("");
      fetchData();
      if (onTaskUpdated) onTaskUpdated(); 
    }
    setIsSubmittingTime(false);
  };

  const applyQuickTime = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    setInputHours(h > 0 ? h.toString() : "");
    setInputMinutes(m > 0 ? m.toString() : "");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative h-full w-full max-w-lg bg-zinc-950 border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-300 rounded-l-2xl overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5 bg-zinc-900/30">
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold text-white bg-transparent border-none focus:ring-0 w-full p-0 placeholder-zinc-700 outline-none"
            placeholder="Título da demanda..."
          />
          <button onClick={onClose} className="ml-4 p-2 text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-zinc-900/50 border-b border-zinc-800 px-6">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-4 px-6 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${
              activeTab === "details" ? "border-indigo-500 text-indigo-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Configuração
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`py-4 px-6 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${
              activeTab === "activity" ? "border-indigo-500 text-indigo-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Chat de Operação ({comments.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === "details" ? (
            <div className="space-y-8">
              
              {/* Cronograma de Duas Datas */}
              <div className="grid grid-cols-2 gap-6 bg-zinc-900/20 p-4 rounded-xl border border-zinc-800/50">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Calendar size={12} /> Início
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Clock size={12} /> Prazo Final
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Status do Workflow E Mês de Planejamento */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Status do Workflow</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-indigo-400 font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="backlog">Caixa de Entrada</option>
                    <option value="todo">Backlog (A Fazer)</option>
                    <option value="in-progress">Desenvolvimento</option>
                    <option value="homologation">Homologação</option>
                    <option value="production">Produção</option>
                    <option value="done">Concluído</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-2">
                    <CalendarDays size={12} /> Mês de Planejamento
                  </label>
                  <input
                    type="month"
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* === MÓDULO DE IMPEDIMENTO (BLOCKER) === */}
              <div className={cn(
                "p-5 rounded-xl border transition-all duration-300",
                isBlocked ? "bg-red-500/10 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.05)]" : "bg-zinc-900/20 border-zinc-800/50"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-lg transition-colors",
                      isBlocked ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-500"
                    )}>
                      <AlertOctagon size={18} />
                    </div>
                    <div>
                      <h4 className={cn("text-sm font-bold transition-colors", isBlocked ? "text-red-400" : "text-zinc-400")}>
                        {isBlocked ? "Tarefa com Impedimento" : "Sinalizar Bloqueio"}
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Alerta a equipe sobre dependências ou travamentos
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setIsBlocked(!isBlocked)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      isBlocked ? "bg-red-500" : "bg-zinc-700"
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      isBlocked ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>
                
                {isBlocked && (
                  <div className="mt-5 pt-5 border-t border-red-500/20 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-red-400 uppercase mb-2 block">Motivo do Bloqueio (O que falta para avançar?)</label>
                    <textarea
                      value={blockerReason}
                      onChange={(e) => setBlockerReason(e.target.value)}
                      placeholder="Ex: Aguardando senha de acesso da API do cliente..."
                      className="w-full bg-red-950/30 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-200 outline-none focus:border-red-500 placeholder-red-800/50 min-h-[80px] resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Múltiplos Usuários E CLIENTE (Ajuste Estratégico) */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Responsável Principal</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-indigo-500"
                  >
                    <option value="">Não atribuído</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Building2 size={12} /> Cliente Vinculado
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-indigo-500"
                  >
                    <option value="">Interno / Sem Cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                  <UserPlus size={12} /> Colaboradores Extras na Atividade
                </label>
                <div className="flex flex-wrap gap-2">
                  {profiles.map(p => (
                    <button
                      key={p.id}
                      onClick={() => toggleCollaborator(p.id)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                        collaborators.includes(p.id) 
                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" 
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}
                    >
                      {p.full_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Escopo da Tarefa</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 min-h-[120px] outline-none focus:border-indigo-500/50"
                  placeholder="Descreva o que deve ser feito ou os logs de erro..."
                />
              </div>

              {/* SEÇÃO OTIMIZADA: Apontamento de Horas com Input Duplo */}
              <div className="space-y-4 border-t border-zinc-800/50 pt-8 mt-6">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Clock size={12} /> Apontamento de Horas
                  </label>
                  {totalTimeSpent > 0 && (
                    <span className="text-xs font-bold bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full">
                      Total: {formatMinutes(totalTimeSpent)}
                    </span>
                  )}
                </div>
                
                {/* Botões de Quick Add (Fricção Zero) */}
                <div className="flex gap-2">
                  <span className="text-[10px] text-zinc-600 flex items-center mr-1"><Zap size={10} className="mr-1"/> Atalhos:</span>
                  <button onClick={() => applyQuickTime(15)} className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded hover:bg-zinc-800 transition-colors">15m</button>
                  <button onClick={() => applyQuickTime(30)} className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded hover:bg-zinc-800 transition-colors">30m</button>
                  <button onClick={() => applyQuickTime(60)} className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded hover:bg-zinc-800 transition-colors">1h</button>
                  <button onClick={() => applyQuickTime(120)} className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded hover:bg-zinc-800 transition-colors">2h</button>
                </div>

                {/* Formulário de Apontamento com UX Avançada */}
                <div className="flex gap-2">
                  <div className="flex gap-1">
                    <div className="relative w-16">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={inputHours}
                        onChange={(e) => setInputHours(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-2 pr-6 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500"
                      />
                      <span className="absolute right-2 top-2 text-xs text-zinc-600">h</span>
                    </div>
                    <div className="relative w-16">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="0"
                        value={inputMinutes}
                        onChange={(e) => setInputMinutes(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-2 pr-6 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500"
                      />
                      <span className="absolute right-2 top-2 text-xs text-zinc-600">m</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="O que foi feito neste tempo?"
                    value={timeDescription}
                    onChange={(e) => setTimeDescription(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddTimeLog}
                    disabled={isSubmittingTime || (!inputHours && !inputMinutes)}
                    className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 min-w-[80px] flex items-center justify-center"
                  >
                    {isSubmittingTime ? <Loader2 size={14} className="animate-spin" /> : "Registrar"}
                  </button>
                </div>

                {/* Histórico de Horas */}
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2 mt-4">
                  {timeLogs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/50">
                      <div>
                        <span className="text-xs font-bold text-indigo-400">{log.profiles?.full_name}</span>
                        <p className="text-[10px] text-zinc-500 mt-1">{log.description || "Tempo registrado (sem descrição)"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-white">{formatMinutes(log.minutes)}</span>
                        <p className="text-[9px] text-zinc-600 mt-1">{format(new Date(log.log_date), "dd/MM/yy", { locale: ptBR })}</p>
                      </div>
                    </div>
                  ))}
                  {timeLogs.length === 0 && (
                    <div className="text-center py-6 text-xs text-zinc-600 border border-dashed border-zinc-800/50 rounded-lg bg-zinc-900/10">
                      Nenhum tempo registrado para esta tarefa.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col h-full space-y-6">
              {/* Feed de Comentários */}
              <div className="flex-1 space-y-4 pb-16">
                {comments.length === 0 && (
                  <div className="text-center py-10">
                    <MessageSquare size={40} className="mx-auto text-zinc-800 mb-2" />
                    <p className="text-xs text-zinc-600 uppercase font-bold">Sem registros de atividade</p>
                  </div>
                )}
                {/* As mensagens são renderizadas de baixo pra cima no array */}
                {[...comments].reverse().map((c) => (
                  <div key={c.id} className="bg-zinc-900/30 border border-zinc-800/50 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">{c.profiles?.full_name}</span>
                      <span className="text-[9px] text-zinc-600">{format(new Date(c.created_at), "HH:mm - dd/MM", { locale: ptBR })}</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{c.content}</p>
                  </div>
                ))}
                {/* Elemento invisível para forçar o scroll até o final do chat */}
                <div ref={chatEndRef} /> 
              </div>

              {/* Input de Chat */}
              <div className="absolute bottom-0 left-0 right-0 bg-zinc-950 p-6 border-t border-zinc-800">
                <div className="relative">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Mencione alguém ou relate um erro de homologação..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none focus:border-indigo-500 resize-none"
                    rows={2}
                  />
                  <button 
                    onClick={handleAddComment}
                    className="absolute right-3 bottom-3 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ação */}
        <div className="p-6 bg-zinc-900/30 border-t border-zinc-800 flex gap-4 z-10">
          <button 
            onClick={handleDelete}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20"
            title="Excluir Tarefa"
          >
            <Trash2 size={20} />
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)]"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <><Save size={20} /> Sincronizar Operação</>}
          </button>
        </div>
      </div>
    </div>
  );
}