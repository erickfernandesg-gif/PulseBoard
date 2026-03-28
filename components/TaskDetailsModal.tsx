"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, MessageSquare, Calendar, Save, Loader2, Trash2, Clock, Plus, UserPlus, Zap, CalendarDays, AlertOctagon, Building2, Maximize2, Minimize2, Edit2, ChevronRight, CheckSquare, ListTodo } from "lucide-react";
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

interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  position_index: number;
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
  const router = useRouter();
  const supabase = createClient();
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [isSaving, setIsSaving] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [collaborators, setCollaborators] = useState<string[]>([]); // Armazena apenas IDs
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentContent, setEditedCommentContent] = useState("");
  const [isSubmittingChat, setIsSubmittingChat] = useState(false);
  
  // Estados de Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

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
  const [priority, setPriority] = useState(initialTask.priority || "medium");
  
  // Estados de Bloqueio e Mês
  const [isBlocked, setIsBlocked] = useState(initialTask.is_blocked || false);
  const [blockerReason, setBlockerReason] = useState(initialTask.blocker_reason || "");
  const [targetMonth, setTargetMonth] = useState(initialTask.target_month || "");

  // Estados de Estimativa (Para paridade com CreateTaskModal)
  const [estHours, setEstHours] = useState(initialTask.estimated_minutes ? Math.floor(initialTask.estimated_minutes / 60).toString() : "");
  const [estMinutes, setEstMinutes] = useState(initialTask.estimated_minutes ? (initialTask.estimated_minutes % 60).toString() : "");

  // Função para formatar minutos em Horas e Minutos (ex: 150m -> 2h 30m)
  const formatMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Função Sênior: Calcula o próximo mês a partir do targetMonth atual ou hoje
  const handlePostponeMonth = () => {
    const current = targetMonth || new Date().toISOString().slice(0, 7);
    const [year, month] = current.split('-').map(Number);
    
    let nextYear = year;
    let nextMonth = month + 1;
    
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    
    const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    setTargetMonth(nextMonthStr);
    toast.info(`Mês alvo alterado para ${nextMonthStr}. Lembre-se de salvar.`);
  };

  const totalTimeSpent = timeLogs.reduce((acc, log) => acc + log.minutes, 0);

  // Carregar dados iniciais
  const fetchData = useCallback(async () => {
    const [profRes, commRes, collRes, timeRes, clientsRes, checkRes] = await Promise.all([
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
      supabase.from("clients").select("id, name").order("name"),
      supabase.from("task_checklists")
        .select("*")
        .eq("task_id", initialTask.id)
        .order("position_index", { ascending: true })
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
    if (checkRes.data) setChecklist(checkRes.data);
  }, [supabase, initialTask.id]);

  useEffect(() => {
    setIsMounted(true);
    fetchData();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, [fetchData, supabase.auth]);

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
      // Cálculo da Estimativa
      const totalEstMinutes = (parseInt(estHours) || 0) * 60 + (parseInt(estMinutes) || 0);

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
          priority,
          target_month: targetMonth || null,
          estimated_minutes: totalEstMinutes,
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

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Deseja excluir permanentemente esta mensagem?")) return;

    const { error } = await supabase.from("task_comments").delete().eq("id", commentId);

    if (error) {
      toast.error("Falha ao remover mensagem.");
    } else {
      toast.success("Mensagem removida com sucesso");
      await fetchData(); // Recarrega o feed
    }
  };

const handleUpdateComment = async (commentId: string) => {
  const contentToSave = editedCommentContent.trim();
  if (!contentToSave) {
    toast.error("A mensagem não pode estar vazia.");
    return;
  }

  setIsSubmittingChat(true);
  try {
    // Adicionamos .select() para confirmar se a linha foi realmente afetada
    const { data, error } = await supabase
      .from("task_comments")
      .update({ content: contentToSave })
      .eq("id", commentId)
      .select(); 

    if (error) throw error;

    // Se o data vier vazio, o RLS bloqueou ou o ID está errado
    if (!data || data.length === 0) {
      console.error("Nenhuma linha atualizada. Verifique as políticas de RLS no Supabase.");
      toast.error("Erro de permissão ao salvar.");
      return;
    }

    setEditingCommentId(null);
    setEditedCommentContent("");
    toast.success("Mensagem atualizada!");
    
    await fetchData();
    router.refresh();
  } catch (error: any) {
    console.error("Erro completo:", error);
    toast.error(error.message || "Falha ao salvar alteração.");
  } finally {
    setIsSubmittingChat(false);
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
      await fetchData();
      router.refresh();
      if (onTaskUpdated) onTaskUpdated();
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

    if (totalMinutesToSave <= 0 || totalMinutesToSave > 1440) { // Max 24h
      toast.error("Insira uma quantidade válida de tempo.");
      return;
    }

    if (!timeDescription.trim()) {
      toast.error("Descreva brevemente o que foi feito nestas horas.");
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
      await fetchData();
      router.refresh();
      if (onTaskUpdated) onTaskUpdated(); 
    }
    setIsSubmittingTime(false);
  };

  // Funções de Checklist
  const addChecklistItem = async () => {
    if (!newChecklistItem.trim()) return;
    const { data, error } = await supabase
      .from("task_checklists")
      .insert({
        task_id: initialTask.id,
        title: newChecklistItem,
        position_index: checklist.length
      })
      .select()
      .single();

    if (!error) {
      setChecklist([...checklist, data]);
      setNewChecklistItem("");
    }
  };

  const toggleChecklistItem = async (id: string, currentStatus: boolean) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, is_completed: !currentStatus } : item));
    await supabase.from("task_checklists").update({ is_completed: !currentStatus }).eq("id", id);
  };

  const deleteChecklistItem = async (id: string) => {
    setChecklist(prev => prev.filter(item => item.id !== id));
    await supabase.from("task_checklists").delete().eq("id", id);
  };

  const applyQuickTime = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    setInputHours(h > 0 ? h.toString() : "");
    setInputMinutes(m > 0 ? m.toString() : "");
  };

  if (!isMounted) return null;

  return createPortal(
    <div className={cn(
      "fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all",
      isFullscreen ? "p-0" : "p-2 md:p-6"
    )}>
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className={cn(
        "relative bg-zinc-950 border border-zinc-800 shadow-[0_20px_70px_rgba(0,0,0,0.7)] flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-hidden transition-all translate-z-0",
        isFullscreen ? "w-screen h-screen rounded-none border-none" : "w-full max-w-5xl h-[92vh] rounded-2xl"
      )}>
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-6 bg-zinc-900/40">
          <div className="flex-1">
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-bold text-white bg-transparent border-none focus:ring-0 w-full p-0 placeholder-zinc-700 outline-none"
              placeholder="Título da demanda..."
            />
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className="p-2 text-zinc-500 hover:text-indigo-400 transition-colors hidden md:block"
              title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
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

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-zinc-950">
          {activeTab === "details" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* COLUNA 1: ESCOPO E IDENTIFICAÇÃO */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-zinc-800 pb-3 flex items-center gap-2">
                  <Building2 size={14} /> 1. Escopo e Identificação
                </h3>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Building2 size={12} /> Cliente Vinculado
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="">Interno / Sem Cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Descrição da Demanda</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-sm text-zinc-200 min-h-[180px] outline-none focus:border-indigo-500 transition-all leading-relaxed shadow-inner"
                    placeholder="Descreva o que deve ser feito..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Status do Workflow</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-indigo-400 font-bold outline-none focus:border-indigo-500"
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
                      <CalendarDays size={12} /> Mês / Ciclo
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="month"
                        value={targetMonth}
                        onChange={(e) => setTargetMonth(e.target.value)}
                        className="flex-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg px-3 py-2.5 text-xs font-bold outline-none focus:border-emerald-500 transition-colors"
                      />
                      <button 
                        type="button"
                        onClick={handlePostponeMonth}
                        className="px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-emerald-500 hover:bg-zinc-800 transition-all shadow-sm"
                        title="Adiar para o próximo mês"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
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
                          {isBlocked ? "Impedimento Ativo" : "Sinalizar Bloqueio"}
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Alerta a equipe sobre travamentos</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setIsBlocked(!isBlocked)} className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out", isBlocked ? "bg-red-500" : "bg-zinc-700")}>
                      <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", isBlocked ? "translate-x-5" : "translate-x-0")} />
                    </button>
                  </div>
                  {isBlocked && (
                    <div className="mt-5 pt-5 border-t border-red-500/20 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-bold text-red-400 uppercase mb-2 block">Motivo do Bloqueio</label>
                      <textarea value={blockerReason} onChange={(e) => setBlockerReason(e.target.value)} placeholder="O que falta para avançar?" className="w-full bg-red-950/30 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-200 outline-none focus:border-red-500 placeholder-red-800/50 min-h-[80px] resize-none" />
                    </div>
                  )}
                </div>
              </div>
              {/* COLUNA 2: EQUIPE E TEMPO */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-3 flex items-center gap-2">
                  <Zap size={14} /> 2. Planejamento e Equipe
                </h3>
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
                  <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Clock size={12} /> Orçamento de Horas (Estimativa)
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Calendar size={12} /> Início Previsto</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Clock size={12} /> Prazo de Entrega</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Responsável Principal</label>
                  <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-indigo-500">
                    <option value="">Não atribuído</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2"><UserPlus size={12} /> Colaboradores Extras</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/80 min-h-[60px] items-start transition-all">
                    {profiles.map(p => (
                      <button key={p.id} onClick={() => toggleCollaborator(p.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${collaborators.includes(p.id) ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-sm" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}>
                        {p.full_name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-zinc-800/50">
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
                  <div className="flex gap-2">
                    <span className="text-[10px] text-zinc-600 flex items-center mr-1"><Zap size={10} className="mr-1"/> Atalhos:</span>
                    <button onClick={() => applyQuickTime(15)} className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded hover:bg-zinc-800 transition-colors">15m</button>
                    <button onClick={() => applyQuickTime(30)} className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded hover:bg-zinc-800 transition-colors">30m</button>
                    <button onClick={() => applyQuickTime(60)} className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded hover:bg-zinc-800 transition-colors">1h</button>
                    <button onClick={() => applyQuickTime(120)} className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded hover:bg-zinc-800 transition-colors">2h</button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex gap-1">
                      <div className="relative w-16">
                        <input
                          type="number" min="0" placeholder="0" value={inputHours} onChange={(e) => setInputHours(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-2 pr-6 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500"
                        />
                        <span className="absolute right-2 top-2 text-xs text-zinc-600">h</span>
                      </div>
                      <div className="relative w-16">
                        <input
                          type="number" min="0" max="59" placeholder="0" value={inputMinutes} onChange={(e) => setInputMinutes(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-2 pr-6 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500"
                        />
                        <span className="absolute right-2 top-2 text-xs text-zinc-600">m</span>
                      </div>
                    </div>
                    <input
                      type="text" placeholder="O que foi feito?" value={timeDescription} onChange={(e) => setTimeDescription(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleAddTimeLog} disabled={isSubmittingTime || (!inputHours && !inputMinutes)}
                      className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 min-w-[80px] flex items-center justify-center"
                    >
                      {isSubmittingTime ? <Loader2 size={14} className="animate-spin" /> : "Registrar"}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2 mt-4">
                    {timeLogs.map((log) => (
                      <div key={log.id} className="flex justify-between items-center bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/50">
                        <div>
                          <span className="text-xs font-bold text-indigo-400">{log.profiles?.full_name}</span>
                          <p className="text-[10px] text-zinc-500 mt-1">{log.description || "Tempo registrado"}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-white">{formatMinutes(log.minutes)}</span>
                          <p className="text-[9px] text-zinc-600 mt-1">{format(new Date(log.log_date), "dd/MM/yy", { locale: ptBR })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full space-y-6">
              {/* Feed de Comentários */}
              <div className="flex-1 space-y-4 pb-28">
                {comments.length === 0 && (
                  <div className="text-center py-10">
                    <MessageSquare size={40} className="mx-auto text-zinc-800 mb-2" />
                    <p className="text-xs text-zinc-600 uppercase font-bold">Sem registros de atividade</p>
                  </div>
                )}
                {/* As mensagens são renderizadas de baixo pra cima no array */}
                {[...comments].reverse().map((c) => (
                  <div key={c.id} className="group/comment bg-zinc-900/30 border border-zinc-800/50 p-4 rounded-xl space-y-2 relative transition-all hover:border-zinc-700/50">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase">{c.profiles?.full_name}</span>
                        <span className="text-[9px] text-zinc-600">{format(new Date(c.created_at), "HH:mm - dd/MM", { locale: ptBR })}</span>
                      </div>
                      
                      {/* Botões de Ação (Apenas para o dono da mensagem) */}
                      {c.user_id === currentUserId && (
                        <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-all">
                          <button
                            onClick={() => {
                              setEditingCommentId(c.id);
                              setEditedCommentContent(c.content);
                            }}
                            className="p-1.5 text-zinc-600 hover:text-indigo-400 rounded-md hover:bg-indigo-500/5"
                            title="Editar mensagem"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 transition-all rounded-md hover:bg-red-500/5"
                            title="Excluir mensagem"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {editingCommentId === c.id ? (
                      <div className="space-y-3 mt-2">
                        <textarea
                          value={editedCommentContent}
                          onChange={(e) => setEditedCommentContent(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-500 resize-none"
                          rows={3}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            type="button"
                            disabled={isSubmittingChat}
                            onClick={() => setEditingCommentId(null)}
                            className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={isSubmittingChat}
                            onClick={() => handleUpdateComment(c.id)}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[10px] font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            {isSubmittingChat && <Loader2 size={12} className="animate-spin" />}
                            {isSubmittingChat ? "Salvando..." : "Confirmar Alteração"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-300 leading-relaxed">{c.content}</p>
                    )}
                  </div>
                ))}
                {/* Elemento invisível para forçar o scroll até o final do chat */}
                <div ref={chatEndRef} /> 
              </div>

              {/* Input de Chat */}
              <div className="sticky bottom-[-40px] left-0 right-0 bg-zinc-950 p-6 border-t border-zinc-800 -mx-10 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                <div className="relative max-w-5xl mx-auto">
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
    </div>,
    document.body
  );
}