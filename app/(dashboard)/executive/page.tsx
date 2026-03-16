import { BarChart3, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";

export default function ExecutiveDashboard() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Painel Executivo
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Visão macro da saúde financeira e operacional.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <DollarSign size={20} />
            <span className="text-sm font-medium">Orçamento vs Gasto</span>
          </div>
          <p className="text-3xl font-bold text-white">R$ 1.2M</p>
          <p className="text-xs text-zinc-500 mt-1">75% do planejado</p>
        </div>
        
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-3 text-indigo-400 mb-2">
            <TrendingUp size={20} />
            <span className="text-sm font-medium">Capacidade Produtiva</span>
          </div>
          <p className="text-3xl font-bold text-white">82%</p>
          <p className="text-xs text-zinc-500 mt-1">+5% vs último mês</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-3 text-amber-400 mb-2">
            <AlertTriangle size={20} />
            <span className="text-sm font-medium">Projetos em Risco</span>
          </div>
          <p className="text-3xl font-bold text-white">3</p>
          <p className="text-xs text-zinc-500 mt-1">Atenção requerida</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-3 text-blue-400 mb-2">
            <BarChart3 size={20} />
            <span className="text-sm font-medium">Entregas no Prazo</span>
          </div>
          <p className="text-3xl font-bold text-white">94%</p>
          <p className="text-xs text-zinc-500 mt-1">Média global</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-white">Gráficos Dinâmicos (BI)</h3>
          <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">
            Integração com ferramentas de Business Intelligence para renderização de painéis de alta performance.
          </p>
        </div>
      </div>
    </div>
  );
}
