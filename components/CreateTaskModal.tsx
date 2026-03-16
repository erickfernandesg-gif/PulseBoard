"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, X, Loader2, Calendar as CalendarIcon, User, Clock } from "lucide-react";
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [startDate, setStartDate] = useState(""); // Novo campo
  const [dueDate, setDueDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([
          {
            board_id: boardId,
            title,
            description,
            status,
            priority,
            assigned_to: assignedTo || null,
            start_date: startDate || null, // Enviando data de início
            due_date: dueDate || null,
            total_minutes_spent: 0, // Inicia zerado
          },
        ])
        .select("*, profiles(full_name, avatar_url)")
        .single();

      if (error) throw error;

      toast.success("Tarefa criada no PulseBoard");
      onTaskCreated(data);
      setIsOpen(false);
      
      // Resetar formulário
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setAssignedTo("");
      setStartDate("");
      setDueDate("");
    } catch (error: any) {
      toast.error(error.message || "Falha ao criar tarefa");
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
        Nova Tarefa
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl my-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Registrar Demanda
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label htmlFor="title" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  Título da Atividade
                </label>
                <input
                  type="text"
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-zinc-900 py-3 px-4 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-700"
                  placeholder="Ex: Ajuste no fluxo de homologação"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  Descrição / Escopo
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-zinc-900 py-3 px-4 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none placeholder:text-zinc-700"
                  placeholder="Detalhes sobre o que deve ser feito..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="status" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                    Coluna Inicial
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="block w-full rounded-xl border-0 bg-zinc-900 py-3 px-4 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="todo">Backlog</option>
                    <option value="in-progress">Desenvolvimento</option>
                    <option value="homologation">Homologação</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                    Prioridade
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="block w-full rounded-xl border-0 bg-zinc-900 py-3 px-4 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="assignee" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                    Responsável Principal
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <User className="h-4 w-4 text-zinc-500" />
                    </div>
                    <select
                      id="assignee"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="block w-full rounded-xl border-0 bg-zinc-900 py-3 pl-11 pr-10 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Não atribuído</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.full_name || profile.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                      Data de Início
                    </label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="block w-full rounded-xl border-0 bg-zinc-900 py-3 pl-11 pr-4 text-sm text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dueDate" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                      Prazo Final
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="date"
                        id="dueDate"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="block w-full rounded-xl border-0 bg-zinc-900 py-3 pl-11 pr-4 text-sm text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-zinc-800/50">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-6 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-900 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition-all shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)] disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Criar Atividade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}