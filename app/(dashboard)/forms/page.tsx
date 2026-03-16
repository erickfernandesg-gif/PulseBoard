"use client";

import { useEffect, useState } from "react";
import { FileText, Link as LinkIcon, Plus, Eye, Check, Loader2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

export default function FormsPage() {
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchBoards() {
      const { data, error } = await supabase
        .from("boards")
        .select("id, name, description")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setBoards(data);
      }
      setLoading(false);
    }
    fetchBoards();
  }, [supabase]);

 const handleCopyLink = (boardId: string) => {
    const publicUrl = `${window.location.origin}/submit/${boardId}`;

    // Tenta usar a API moderna de Clipboard
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(publicUrl)
        .then(() => {
          setCopiedId(boardId);
          setTimeout(() => setCopiedId(null), 2000);
        })
        .catch(() => alert(`Copie o link manualmente: ${publicUrl}`));
    } else {
      // Plano B: Cria um campo de texto invisível, seleciona e copia (funciona em HTTP e IPs locais)
      const textArea = document.createElement("textarea");
      textArea.value = publicUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        setCopiedId(boardId);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        alert(`Copie o link manualmente: ${publicUrl}`);
      }
      
      textArea.remove();
    }
  };

  const handlePreview = (boardId: string) => {
    window.open(`/submit/${boardId}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Formulários de Solicitação
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Compartilhe estes links para receber demandas externas diretamente nos seus quadros.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <Plus size={16} />
          Novo Quadro / Formulário
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <div 
              key={board.id} 
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-indigo-500/50 hover:bg-zinc-800/40 transition-all group"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-semibold text-white truncate">
                  Entrada: {board.name}
                </h3>
                <p className="text-sm text-zinc-400 mt-2 line-clamp-2">
                  Qualquer solicitação enviada por este link cairá automaticamente na coluna "To Do" do quadro {board.name}.
                </p>
              </div>
              
              <div className="mt-6 flex items-center justify-between border-t border-zinc-800/80 pt-4">
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => handleCopyLink(board.id)}
                    className="flex-1 flex justify-center items-center gap-1.5 rounded-md bg-zinc-800/80 px-2.5 py-2 text-xs font-medium text-zinc-300 hover:bg-indigo-500 hover:text-white transition-colors border border-zinc-700 hover:border-indigo-500"
                  >
                    {copiedId === board.id ? (
                      <><Check size={14} /> Copiado!</>
                    ) : (
                      <><LinkIcon size={14} /> Copiar Link</>
                    )}
                  </button>
                  <button 
                    onClick={() => handlePreview(board.id)}
                    className="flex-1 flex justify-center items-center gap-1.5 rounded-md bg-zinc-800/80 px-2.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors border border-zinc-700"
                  >
                    <Eye size={14} />
                    Testar
                  </button>
                </div>
              </div>
            </div>
          ))}

          {boards.length === 0 && (
            <div className="col-span-full p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              Nenhum quadro encontrado. Crie um quadro primeiro para gerar seu formulário.
            </div>
          )}
        </div>
      )}
    </div>
  );
}