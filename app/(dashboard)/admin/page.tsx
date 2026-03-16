import { Users, Shield, UserPlus, MoreVertical } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Administração e Gestão de Usuários
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Governança Corporativa e controle de acessos (RBAC).
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors w-full sm:w-auto justify-center">
          <UserPlus size={16} />
          Convidar Usuário
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Usuários Ativos</h2>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Shield size={16} className="text-indigo-400" />
            <span>3 Administradores</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-800/50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-3">Nome / Email</th>
                <th className="px-6 py-3">Departamento</th>
                <th className="px-6 py-3">Função (Role)</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                      JS
                    </div>
                    <div>
                      <p className="font-medium text-white">João Silva</p>
                      <p className="text-xs text-zinc-500">joao.silva@empresa.com</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">Diretoria</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400">
                    <Shield size={12} />
                    Administrador
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    Ativo
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-zinc-500 hover:text-white transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-white font-medium">
                      MA
                    </div>
                    <div>
                      <p className="font-medium text-white">Maria Almeida</p>
                      <p className="text-xs text-zinc-500">maria.almeida@empresa.com</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">Marketing</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300">
                    <Users size={12} />
                    Membro
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    Ativo
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-zinc-500 hover:text-white transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
