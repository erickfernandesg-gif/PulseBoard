"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Plus, X, Loader2, Layout, Code, ShoppingBag, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

// 1. Definição dos Templates de Workflow
const BOARD_TEMPLATES = {
  dev: {
    label: "Desenvolvimento",
    icon: <Code size={18} />,
    columns: [
      { id: "backlog", title: "Caixa de Entrada" },
      { id: "todo", title: "A Fazer" },
      { id: "in-progress", title: "Desenvolvimento" },
      { id: "homologation", title: "Homologação" },
      { id: "production", title: "Produção" },
      { id: "done", title: "Concluído" },
    ]
  },
  operation: {
    label: "Operação",
    icon: <ShoppingBag size={18} />,
    columns: [
      { id: "backlog", title: "Caixa de Entrada" },
      { id: "todo", title: "Novo Pedido" },
      { id: "in-progress", title: "Em Produção" },
      { id: "delivery", title: "Pronto p/ Entrega" },
      { id: "done", title: "Finalizado / Pago" },
    ]
  },
  simple: {
    label: "Fluxo Simples",
    icon: <ListChecks size={18} />,
    columns: [
      { id: "backlog", title: "Caixa de Entrada" },
      { id: "todo", title: "A Fazer" },
      { id: "in-progress", title: "Em Execução" },
      { id: "done", title: "Concluído" },
    ]
  }
};

export function CreateBoardModal({
  variant = "solid",
}: {
  variant?: "solid" | "outline";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState<keyof typeof BOARD_TEMPLATES>("dev");
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Pegamos as colunas baseadas no template escolhido
      const selectedSettings = BOARD_TEMPLATES[template].columns;

      const { data, error } = await supabase
        .from("boards")
        .insert([{ 
          name, 
          description, 
          owner_id: user.id,
          settings: selectedSettings // 2. Gravando o Workflow no Banco
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Quadro criado com sucesso!");
      setIsOpen(false);
      setName("");
      setDescription("");
      router.push(`/boards/${data.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Falha ao criar quadro");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-sm font-bold tracking-tight transition-all active:scale-95",
          variant === "solid"
            ? "bg-indigo-600 text-white hover:bg-indigo-500 h-10 px-4 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
            : "border border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-400 h-10 px-4",
        )}
      >
        <Plus className="mr-2 h-4 w-4" />
        Novo Quadro
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                  <Layout className="text-indigo-400" size={20} />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Novo Ecossistema
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Nome do Quadro
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border-0 bg-zinc-900 py-3 px-4 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-zinc-700"
                  placeholder="Ex: PulseBoard Core"
                />
              </div>

              {/* Seletor de Templates Visual */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Tipo de Workflow
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {(Object.keys(BOARD_TEMPLATES) as Array<keyof typeof BOARD_TEMPLATES>).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTemplate(key)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                        template === key 
                          ? "bg-indigo-500/10 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                          : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg border",
                        template === key ? "border-indigo-500/50 bg-indigo-500/20" : "border-zinc-700 bg-zinc-800"
                      )}>
                        {BOARD_TEMPLATES[key].icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{BOARD_TEMPLATES[key].label}</p>
                        <p className="text-[10px] opacity-60">
                          {BOARD_TEMPLATES[key].columns.length} colunas configuradas
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Descrição (Opcional)
                </label>
                <textarea
                  id="description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border-0 bg-zinc-900 py-3 px-4 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder:text-zinc-700"
                  placeholder="Qual o objetivo deste quadro?"
                />
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-zinc-800/50">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-zinc-500 hover:text-white transition-colors"
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
                  Criar Ecossistema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}