import { FileText, Link as LinkIcon, Plus, Eye } from "lucide-react";

export default function FormsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Formulários de Solicitação
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Organize a &quot;porta de entrada&quot; de demandas.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors w-full sm:w-auto justify-center">
          <Plus size={16} />
          Novo Formulário
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col justify-between hover:border-indigo-500/50 transition-colors">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white">Solicitação de TI</h3>
            <p className="text-sm text-zinc-400 mt-2 line-clamp-2">
              Formulário para abertura de chamados técnicos e suporte de infraestrutura.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-4">
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors">
                <LinkIcon size={14} />
                Copiar Link
              </button>
              <button className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors">
                <Eye size={14} />
                Visualizar
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col justify-between hover:border-indigo-500/50 transition-colors">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400 mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white">Briefing de Marketing</h3>
            <p className="text-sm text-zinc-400 mt-2 line-clamp-2">
              Solicitação de peças gráficas, campanhas e materiais publicitários.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-4">
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors">
                <LinkIcon size={14} />
                Copiar Link
              </button>
              <button className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors">
                <Eye size={14} />
                Visualizar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
