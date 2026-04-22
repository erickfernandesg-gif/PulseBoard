"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Send, CheckCircle2, AlertCircle, User, Calendar, Tag, AlertTriangle } from "lucide-react";

export default function PublicFormPage() {
  const params = useParams();
  const boardId = params.boardId as string;
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const IMPACT_PRIORITY_MAP: Record<string, "urgent" | "high" | "medium" | "low"> = {
    "Bloqueante": "urgent",
    "Alto": "high",
    "Médio": "medium",
    "Baixo": "low"
  };

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const requesterName = formData.get("requesterName") as string;
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const impact = formData.get("impact") as string;
    const desiredDate = formData.get("desiredDate") as string;
    const rawDescription = formData.get("description") as string;

    // Formata a descrição para incluir os metadados do formulário no topo
    const finalDescription = `
👤 SOLICITANTE: ${requesterName}
📂 CATEGORIA: ${category}
⚠️ IMPACTO: ${impact}
📅 PRAZO DESEJADO: ${desiredDate ? new Date(desiredDate).toLocaleDateString('pt-BR') : 'Não informado'}

---
DESCRIÇÃO:
${rawDescription}
    `.trim();

    const priority = IMPACT_PRIORITY_MAP[impact] || "medium";

    const { error: insertError } = await supabase.from("tasks").insert([
      {
        board_id: boardId,
        title: title.trim(),
        description: finalDescription,
        status: "backlog",
        priority,
        due_date: desiredDate || null,
      },
    ]);

    if (insertError) {
      console.error("Erro na submissão:", insertError);
      setError("Erro ao enviar a solicitação. Verifique os dados e tente novamente.");
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 animate-in fade-in zoom-in duration-300">
          <CheckCircle2 className="h-20 w-20 text-emerald-500 mx-auto" />
          <h1 className="text-3xl font-bold text-slate-900">Enviado com Sucesso!</h1>
          <p className="text-slate-500">Sua solicitação já está na fila de processamento da equipe.</p>
          <button 
            onClick={() => setSuccess(false)}
            className="mt-8 px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 shadow-sm transition-all"
          >
            Enviar outra demanda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="mb-10 text-center">
          <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 mb-4 mx-auto">
            <Send className="h-6 w-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portal de Solicitações</h1>
          <p className="text-slate-500 text-sm mt-2">Preencha os detalhes abaixo para registrar sua demanda no PulseBoard.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm animate-in slide-in-from-top">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <User size={14} /> Seu Nome
              </label>
              <input 
                required
                name="requesterName"
                placeholder="Quem está solicitando?"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <Calendar size={14} /> Prazo Desejado
              </label>
              <input 
                name="desiredDate"
                type="date"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              Título da Demanda
            </label>
            <input 
              required
              name="title"
              placeholder="Resumo curto da tarefa"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <Tag size={14} /> Categoria
              </label>
              <select 
                name="category"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer"
              >
                <option value="Suporte">Suporte Técnico</option>
                <option value="Bug">Relatar Erro/Bug</option>
                <option value="Melhoria">Sugestão de Melhoria</option>
                <option value="Novo Projeto">Novo Projeto/Demanda</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <AlertTriangle size={14} /> Impacto
              </label>
              <select 
                name="impact"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer"
              >
                <option value="Médio">Médio - Rotina normal</option>
                <option value="Baixo">Baixo - Sem pressa</option>
                <option value="Alto">Alto - Urgência operacional</option>
                <option value="Bloqueante">Bloqueante - Trabalho parado</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Descrição Detalhada
            </label>
            <textarea 
              required
              name="description"
              rows={4}
              placeholder="Explique o que precisa ser feito com o máximo de detalhes..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none resize-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-sm"
          >
            {loading ? <span className="animate-pulse">Processando...</span> : <><Send size={18} /> Enviar Solicitação</>}
          </button>
        </form>
      </div>
      
      <p className="mt-8 text-slate-400 text-xs">
        PulseBoard &copy; 2026 - Gestão Operacional Inteligente
      </p>
    </div>
  );
}