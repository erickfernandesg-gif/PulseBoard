"use client";

import { useState, useEffect } from "react";
import { UserCircle, Bell, Lock, Palette, Save, Loader2, Shield } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export default function SettingsPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Estados de Dados do Usuário
  const [userId, setUserId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Busca os dados assim que a página carrega
  useEffect(() => {
    async function loadUserProfile() {
      setIsLoading(true);
      try {
        // 1. Pega a sessão atual (para o email e ID)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setUserId(user.id);
        setEmail(user.email || "");

        // 2. Pega os dados públicos do Perfil
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

        if (profile) {
          // Divide "Erick Fernandes" em First e Last name para preencher seus inputs
          const nameParts = (profile.full_name || "").trim().split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
          setRole(profile.role);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserProfile();
  }, [supabase]);

  // Salvar no Banco de Dados
  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      toast.error("O primeiro nome é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
      
      // Opcional: Força um reload na página para o Topbar pegar o nome novo caso você não tenha um estado global
      window.dispatchEvent(new Event("profileUpdated")); 
    } catch (error: any) {
      toast.error("Erro ao salvar as configurações.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Pega as iniciais dinamicamente (Ex: Erick Fernandes -> EF)
  const getInitials = () => {
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName.charAt(0).toUpperCase();
    return `${first}${last}` || "U";
  };

  const translateRole = (userRole: string) => {
    if (userRole === "admin") return "Administrador Geral";
    if (userRole === "manager") return "Gestor";
    return "Colaborador Padrão";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Configurações e Perfil
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Gerencie suas informações pessoais e credenciais de acesso.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Menu Lateral das Configurações */}
        <div className="md:col-span-1 space-y-1">
          <button 
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "profile" 
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
            }`}
          >
            <UserCircle size={18} />
            Meu Perfil
          </button>
          
          <button 
            onClick={() => toast.info("Notificações estarão disponíveis na v2 do PulseBoard.")}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-colors"
          >
            <Bell size={18} />
            Notificações
          </button>
          
          <button 
            onClick={() => toast.info("Segurança estará disponível na v2 do PulseBoard.")}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-colors"
          >
            <Lock size={18} />
            Segurança
          </button>
          
          <button 
            onClick={() => toast.info("Temas estarão disponíveis na v2 do PulseBoard.")}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-colors"
          >
            <Palette size={18} />
            Aparência
          </button>
        </div>

        {/* Área Principal */}
        <div className="md:col-span-3 space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden shadow-lg">
            
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/40">
              <h2 className="text-lg font-semibold text-white">Informações Pessoais</h2>
              <p className="text-xs text-zinc-500 mt-1">Atualize sua foto e detalhes pessoais aqui.</p>
            </div>
            
            <div className="p-6">
              {/* Avatar e Foto */}
              <div className="flex items-center gap-6 mb-8">
                <div className="h-20 w-20 rounded-full bg-indigo-600 border-2 border-indigo-500/30 shadow-lg shadow-indigo-500/20 flex items-center justify-center text-2xl text-white font-bold tracking-widest">
                  {getInitials()}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <button 
                      onClick={() => toast.info("Upload de foto em breve.")}
                      className="rounded-md bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors border border-zinc-700"
                    >
                      Alterar Foto
                    </button>
                    {role === "admin" && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                        <Shield size={12} /> Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Sua conta está configurada como <strong className="text-zinc-300">{translateRole(role)}</strong>.
                  </p>
                </div>
              </div>

              {/* Formulário */}
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Primeiro Nome</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Sobrenome</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Email Corporativo (Login)</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      value={email} 
                      disabled 
                      className="w-full rounded-lg border border-zinc-800/50 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed" 
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Lock size={14} className="text-zinc-600" />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1.5">
                    O e-mail de acesso não pode ser alterado por aqui. Contate o suporte.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-800/50 flex justify-end">
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}