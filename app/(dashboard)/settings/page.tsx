import { UserCircle, Bell, Lock, Palette, Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Configurações e Perfil
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Gerencie suas preferências pessoais e notificações.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md bg-indigo-500/10 text-indigo-400">
            <UserCircle size={18} />
            Perfil
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-colors">
            <Bell size={18} />
            Notificações
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-colors">
            <Lock size={18} />
            Segurança
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-colors">
            <Palette size={18} />
            Aparência
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Informações Pessoais</h2>
            
            <div className="flex items-center gap-6 mb-8">
              <div className="h-20 w-20 rounded-full bg-indigo-500 flex items-center justify-center text-2xl text-white font-medium">
                JS
              </div>
              <div>
                <button className="rounded-md bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
                  Alterar Foto
                </button>
                <p className="text-xs text-zinc-500 mt-2">
                  JPG, GIF ou PNG. Máximo de 2MB.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Nome</label>
                  <input type="text" defaultValue="João" className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Sobrenome</label>
                  <input type="text" defaultValue="Silva" className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Email Corporativo</label>
                <input type="email" defaultValue="joao.silva@empresa.com" disabled className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-500 cursor-not-allowed" />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                <Save size={16} />
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
