import { CheckCircle2, Clock, Calendar } from "lucide-react";

export default function MyWorkPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Meu Trabalho
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Suas prioridades consolidadas de todos os projetos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Atrasado */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <Clock size={20} />
            <h2 className="font-semibold">Atrasado</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-zinc-900/80 p-4 border border-zinc-800">
              <p className="text-sm font-medium text-white">Revisar contrato da agência</p>
              <p className="text-xs text-zinc-500 mt-1">Projeto Alpha • Ontem</p>
            </div>
          </div>
        </div>

        {/* Hoje */}
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-6">
          <div className="flex items-center gap-3 text-indigo-400 mb-4">
            <CheckCircle2 size={20} />
            <h2 className="font-semibold">Hoje</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-zinc-900/80 p-4 border border-zinc-800">
              <p className="text-sm font-medium text-white">Aprovar design da Home</p>
              <p className="text-xs text-zinc-500 mt-1">Website Redesign • 14:00</p>
            </div>
            <div className="rounded-lg bg-zinc-900/80 p-4 border border-zinc-800">
              <p className="text-sm font-medium text-white">Reunião de Alinhamento</p>
              <p className="text-xs text-zinc-500 mt-1">Operações • 16:30</p>
            </div>
          </div>
        </div>

        {/* Próxima Semana */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-3 text-zinc-400 mb-4">
            <Calendar size={20} />
            <h2 className="font-semibold">Próxima Semana</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-zinc-900/80 p-4 border border-zinc-800">
              <p className="text-sm font-medium text-white">Planejamento Q3</p>
              <p className="text-xs text-zinc-500 mt-1">Estratégia • Seg, 09:00</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
