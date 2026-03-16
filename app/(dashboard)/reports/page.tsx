import { PieChart, Filter, Download } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Relatórios Entre Projetos
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Visão macro departamental e cruzamento de dados.
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-md bg-zinc-800 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors">
            <Filter size={16} />
            Filtros
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Desempenho por Departamento</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-800/50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-3">Departamento</th>
                <th className="px-6 py-3">Projetos Ativos</th>
                <th className="px-6 py-3">Orçamento Alocado</th>
                <th className="px-6 py-3">Taxa de Conclusão</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-4 font-medium text-white">Tecnologia</td>
                <td className="px-6 py-4">12</td>
                <td className="px-6 py-4">R$ 450.000</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-zinc-800">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: "85%" }}></div>
                    </div>
                    <span>85%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    Saudável
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-4 font-medium text-white">Marketing</td>
                <td className="px-6 py-4">8</td>
                <td className="px-6 py-4">R$ 280.000</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-zinc-800">
                      <div className="h-2 rounded-full bg-amber-500" style={{ width: "60%" }}></div>
                    </div>
                    <span>60%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                    Atenção
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-4 font-medium text-white">Operações</td>
                <td className="px-6 py-4">15</td>
                <td className="px-6 py-4">R$ 620.000</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-zinc-800">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: "92%" }}></div>
                    </div>
                    <span>92%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    Saudável
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
