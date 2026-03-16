import { Zap, Plus, ArrowRight } from "lucide-react";

export default function AutomationsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Construtor de Automações
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Reduza o trabalho braçal com regras lógicas.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors w-full sm:w-auto justify-center">
          <Plus size={16} />
          Nova Automação
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-500/50 transition-colors cursor-pointer">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex shrink-0 h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Notificar Diretor na Conclusão</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-zinc-400">
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">SE</span>
                <span>Status mudar para Concluído</span>
                <ArrowRight size={14} className="text-zinc-600 hidden sm:block" />
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">ENTÃO</span>
                <span>Notificar Diretor e registrar data</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="flex h-6 w-10 items-center rounded-full bg-indigo-500 p-1">
              <span className="h-4 w-4 rounded-full bg-white translate-x-4 transition-transform"></span>
            </span>
            <span className="text-sm text-zinc-400">Ativo</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-500/50 transition-colors cursor-pointer">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex shrink-0 h-12 w-12 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-300">Atribuir Tarefa por Departamento</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-zinc-500">
                <span className="rounded bg-zinc-800/50 px-2 py-0.5 text-xs">SE</span>
                <span>Nova tarefa em &quot;Design&quot;</span>
                <ArrowRight size={14} className="text-zinc-700 hidden sm:block" />
                <span className="rounded bg-zinc-800/50 px-2 py-0.5 text-xs">ENTÃO</span>
                <span>Atribuir a &quot;João Silva&quot;</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="flex h-6 w-10 items-center rounded-full bg-zinc-800 p-1">
              <span className="h-4 w-4 rounded-full bg-zinc-500 transition-transform"></span>
            </span>
            <span className="text-sm text-zinc-500">Inativo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
