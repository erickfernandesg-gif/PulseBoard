"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Paperclip, MessageSquare, User, Calendar, Save, Loader2, Trash2, Clock, Plus, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface TaskDetailsModalProps {
  task: any;
  onClose: () => void;
  onTaskUpdated?: () => void;
  onTaskDeleted?: (taskId: string) => void;
}

export function TaskDetailsModal({
  task,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailsModalProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [isSaving, setIsSaving] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Novos estados de Apontamento de Horas (Time Tracking)
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [newMinutes, setNewMinutes] = useState("");
  const [timeDescription, setTimeDescription] = useState("");
  const [isSubmittingTime, setIsSubmittingTime] = useState(false);

  // Estados dos campos editáveis da Tarefa
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [startDate, setStartDate] = useState(task.start_date ? task.start_date.split("T")[0] : "");
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split("T")[0] : "");
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || "");
  const [status, setStatus] = useState(task.status);

  // Carregar dados iniciais (Perfis, Comentários, Colaboradores e Logs de Tempo)
  const fetchData = useCallback(async () => {
    const [profRes, commRes, collRes, timeRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name"),
      supabase.from("task_comments")
        .select("*, profiles(full_name)")
        .eq("task_id", task.id)
        .order("created_at", { ascending: false }),
      supabase.from("task_collaborators")
        .select("user_id, profiles(full_name)")
        .eq("task_id", task.id),
      supabase.from("time_logs")
        .select("*, profiles(full_name)")
        .eq("task_id", task.id)
        .order("created_at", { ascending: false })
    ]);

    if (profRes.data) setProfiles(profRes.data);
    if (commRes.data) setComments(commRes.data);
    if (collRes.data) setCollaborators(collRes.data.map(c => c.user_id));
    if (timeRes.data) setTimeLogs(timeRes.data);
  }, [supabase, task.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!window.confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;

      toast.success("Tarefa excluída com sucesso");
      
      // Chama a função passando o ID para o Kanban remover o card certo
      if (onTaskDeleted) onTaskDeleted(task.id);
      
      onClose();
    } catch (error: any) {
      toast.error("Erro ao excluir a tarefa");
      console.error(error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Atualizar Tarefa Principal
      const { error: taskError } = await supabase
        .from("tasks")
        .update({
          title,
          description,
          start_date: startDate || null,
          due_date: dueDate || null,
          assigned_to: assignedTo || null,
          status,
          // total_minutes_spent removido para evitar conflitos. O histórico real fica na tabela time_logs.
        })
        .eq("id", task.id);

      if (taskError) throw taskError;

      // 2. Sincronizar Colaboradores (Limpa e reinsere para simplificar)
      await supabase.from("task_collaborators").delete().eq("task_id", task.id);
      if (collaborators.length > 0) {
        const collData = collaborators.map(uid => ({ task_id: task.id, user_id: uid }));
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
      task_id: task.id,
      user_id: user.id,
      content: newComment
    });

    if (!error) {
      setNewComment("");
      fetchData(); // Recarrega o chat
    }
  };

  const toggleCollaborator = (userId: string) => {
    setCollaborators(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Nova função para registrar o apontamento de horas
  const handleAddTimeLog = async () => {
    if (!newMinutes || isNaN(Number(newMinutes)) || Number(newMinutes) <= 0) {
      toast.error("Insira uma quantidade válida de minutos.");
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
      task_id: task.id,
      user_id: user.id,
      minutes: Number(newMinutes),
      description: timeDescription,
      log_date: new Date().toISOString().split('T')[0]
    });

    if (error) {
      toast.error("Erro ao registrar horas. Verifique as permissões.");
      console.error(error);
    } else {
      toast.success("Horas registradas com sucesso!");
      setNewMinutes("");
      setTimeDescription("");
      fetchData(); // Recarrega os apontamentos e histórico
    }
    setIsSubmittingTime(false);
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

        {/* Tabs Estilo Terminal */}
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

              {/* Workflow Status */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Status do Workflow</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-indigo-400 font-bold outline-none focus:border-indigo-500"
                >
                  <option value="todo">Backlog</option>
                  <option value="in-progress">Desenvolvimento</option>
                  <option value="homologation">Homologação</option>
                  <option value="production">Produção</option>
                  <option value="done">Concluído</option>
                </select>
              </div>

              {/* Múltiplos Usuários (Responsável + Time) */}
              <div className="space-y-4">
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
                    <UserPlus size={12} /> Colaboradores da Atividade
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

              {/* NOVA SEÇÃO: Apontamento de Horas */}
              <div className="space-y-4 border-t border-zinc-800/50 pt-8 mt-6">
                <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                  <Clock size={12} /> Apontamento de Horas (Time Tracking)
                </label>
                
                {/* Formulário de Apontamento */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Minutos"
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(e.target.value)}
                    className="w-24 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="O que foi feito?"
                    value={timeDescription}
                    onChange={(e) => setTimeDescription(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddTimeLog}
                    disabled={isSubmittingTime}
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
                        <p className="text-[10px] text-zinc-500 mt-1">{log.description || "Sem descrição"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-white">{log.minutes} min</span>
                        <p className="text-[9px] text-zinc-600 mt-1">{format(new Date(log.log_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                    </div>
                  ))}
                  {timeLogs.length === 0 && (
                    <div className="text-center py-4 text-xs text-zinc-600 border border-dashed border-zinc-800/50 rounded-lg">
                      Nenhum tempo registrado para esta tarefa.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col h-full space-y-6">
              {/* Feed de Comentários */}
              <div className="flex-1 space-y-4">
                {comments.length === 0 && (
                  <div className="text-center py-10">
                    <MessageSquare size={40} className="mx-auto text-zinc-800 mb-2" />
                    <p className="text-xs text-zinc-600 uppercase font-bold">Sem registros de atividade</p>
                  </div>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="bg-zinc-900/30 border border-zinc-800/50 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">{c.profiles?.full_name}</span>
                      <span className="text-[9px] text-zinc-600">{format(new Date(c.created_at), "HH:mm - dd/MM", { locale: ptBR })}</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>

              {/* Input de Chat */}
              <div className="sticky bottom-0 bg-zinc-950 pt-4 border-t border-zinc-800">
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
                <p className="text-[9px] text-zinc-600 mt-2 text-center uppercase tracking-widest">
                  O histórico de chat é imutável para fins de auditoria
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ação */}
        <div className="p-6 bg-zinc-900/30 border-t border-zinc-800 flex gap-4">
          <button 
            onClick={handleDelete}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20"
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