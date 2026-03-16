"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function PublicFormPage() {
  const params = useParams();
  const boardId = params.boardId as string;
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as string;

    // Adiciona a tarefa diretamente na coluna 'todo' do Board específico
    const { error: insertError } = await supabase.from("tasks").insert([
      {
        board_id: boardId,
        title,
        description,
        status: "todo",
        priority,
      },
    ]);

    if (insertError) {
      setError("Erro ao enviar a solicitação. Tente novamente.");
      console.error(insertError);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Solicitação Recebida!</h1>
          <p className="text-zinc-400">A sua demanda foi encaminhada com sucesso para a equipe responsável.</p>
          <button 
            onClick={() => setSuccess(false)}
            className="mt-6 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Enviar nova solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 shadow-xl">
        <div className="mb-8">
          <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20 mb-4">
            <Send className="h-5 w-5 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nova Solicitação</h1>
          <p className="text-zinc-400 text-sm mt-1">Preencha os dados abaixo para abrir um ticket.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Título da Solicitação *</label>
            <input 
              required
              name="title"
              type="text" 
              placeholder="Ex: Atualização de banner no site"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Descrição Detalhada</label>
            <textarea 
              name="description"
              rows={4}
              placeholder="Descreva o que precisa ser feito..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Nível de Prioridade</label>
            <select 
              name="priority"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
            >
              <option value="low">Baixa (Pode esperar)</option>
              <option value="medium">Média (Rotina normal)</option>
              <option value="high">Alta (Urgente / Crítico)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(99,102,241,0.2)]"
          >
            {loading ? <span className="animate-pulse">Enviando...</span> : "Enviar Solicitação"}
          </button>
        </form>
      </div>
    </div>
  );
}