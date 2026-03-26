"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Search, LogOut, Settings, Activity, CheckCircle2, Shield, TrendingUp } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
// 1. IMPORTANTE: Importar o tipo User do Supabase
import { User } from "@supabase/supabase-js";

// 2. ADICIONAR: Definir o que o componente espera receber
interface TopbarProps {
  user: User | null;
}

// 3. ATUALIZAR: Receber a prop 'user'
export function Topbar({ user }: TopbarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const supabase = createClient();
  const router = useRouter();
  
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      // Otimização: Se já recebemos o 'user' via prop, não precisamos chamar supabase.auth.getUser()
      const currentUser = user; 
      if (!currentUser) return;

      // 1. Carregar Perfil (trazendo a 'role' para permissões)
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();
      
      setUserProfile(profile || { full_name: currentUser.email, email: currentUser.email, id: currentUser.id, role: 'user' });

      const lastRead = profile?.last_read_notifications_at || new Date(0).toISOString();

      // 2. Carregar o Histórico de Notificações
      const { data: logs } = await supabase
        .from("activity_log")
        .select("*, profiles(full_name), tasks(title, board_id)")
        .order("created_at", { ascending: false })
        .limit(10);

      if (logs) {
        setNotifications(logs);
        const unread = logs.filter(log => new Date(log.created_at) > new Date(lastRead)).length;
        setUnreadCount(unread);
      }
    }
    
    loadData();

    const channel = supabase
      .channel('topbar-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, () => {
        loadData();
      })
      .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.removeChannel(channel);
    };
  }, [supabase, user]); // Adicionei 'user' aqui como dependência

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Erro ao encerrar sessão");
    }
  };

  const clearNotifications = async () => {
    if (!userProfile?.id) return;
    const now = new Date().toISOString();
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ last_read_notifications_at: now })
        .eq("id", userProfile.id);

      if (error) throw error;
      setUnreadCount(0);
      setUserProfile((prev: any) => ({ ...prev, last_read_notifications_at: now }));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registrar leitura de notificações.");
    }
  };

  const renderNotificationText = (log: any) => {
    const userName = log.profiles?.full_name?.split(" ")[0] || "Alguém";
    const taskTitle = log.tasks?.title || log.details?.task_title || "uma tarefa";
    const newStatus = log.details?.new_status;

    if (log.action === "status_changed") {
      return (
        <span>
          <span className="font-bold text-white">{userName}</span> moveu a tarefa <span className="text-indigo-400">"{taskTitle}"</span> para <span className="font-bold text-emerald-400">{newStatus}</span>.
        </span>
      );
    }
    return <span><span className="font-bold text-white">{userName}</span> atualizou uma tarefa.</span>;
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-800/50 bg-zinc-950/80 px-6 backdrop-blur-md">
      <div className="flex flex-1 items-center">
        <div className="relative w-full max-w-md hidden md:block group">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full rounded-lg border border-zinc-800 bg-zinc-900/50 py-2 pl-10 pr-3 text-sm text-zinc-200 placeholder-zinc-500 outline-none transition-all focus:border-indigo-500/50 focus:bg-zinc-900 focus:ring-1 focus:ring-indigo-500/50"
            placeholder="Pesquisar tarefas ou quadros (Cmd+K)"
            disabled
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        
        {/* Notificações */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              if (isProfileOpen) setIsProfileOpen(false);
            }}
            className={cn(
              "relative rounded-full p-2 transition-colors focus:outline-none",
              isNotifOpen ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            )}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500 border-2 border-zinc-950"></span>
              </span>
            )}
          </button>

          <div className={cn(
            "absolute right-0 mt-3 w-80 origin-top-right rounded-xl border border-zinc-800 bg-zinc-950 shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all",
            isNotifOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
          )}>
            <div className="flex items-center justify-between border-b border-zinc-800/50 px-4 py-3">
              <h3 className="text-sm font-bold text-white">Notificações</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={clearNotifications} 
                  className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20"
                >
                  <CheckCircle2 size={12} /> Marcar como lido
                </button>
              )}
            </div>
            
            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-zinc-500">
                  <Bell className="mx-auto mb-2 h-6 w-6 opacity-20" />
                  Nenhuma atividade recente
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((log) => {
                    const isUnread = new Date(log.created_at) > new Date(userProfile?.last_read_notifications_at || 0);

                    return (
                      <Link 
                        key={log.id}
                        href={log.tasks?.board_id ? `/boards/${log.tasks.board_id}` : "#"}
                        onClick={() => setIsNotifOpen(false)}
                        className={cn(
                          "group flex gap-3 border-b border-zinc-800/50 p-4 transition-colors last:border-0",
                          isUnread ? "bg-zinc-900/80 hover:bg-zinc-800" : "bg-transparent hover:bg-zinc-900/50"
                        )}
                      >
                        <div className={cn(
                          "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                          isUnread ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"
                        )}>
                          <Activity size={12} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className={cn("text-xs leading-snug", isUnread ? "text-zinc-200" : "text-zinc-400")}>
                            {renderNotificationText(log)}
                          </p>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-zinc-800"></div>

        {/* Menu do Perfil */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              if (isNotifOpen) setIsNotifOpen(false);
            }}
            className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-900/50 p-1 pr-3 transition-all hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white uppercase shadow-sm">
              {userProfile?.full_name?.charAt(0) || userProfile?.email?.charAt(0) || "U"}
            </div>
            <span className="text-sm font-medium text-zinc-300 hidden sm:block">
              {userProfile?.full_name?.split(' ')[0] || "Perfil"}
            </span>
          </button>

          <div className={cn(
            "absolute right-0 mt-3 w-64 origin-top-right rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-2xl transition-all",
            isProfileOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
          )}>
            <div className="border-b border-zinc-800/50 px-3 py-3 mb-1 bg-zinc-900/30 rounded-t-lg">
              <p className="text-sm font-bold text-white truncate">{userProfile?.full_name || "Utilizador"}</p>
              <p className="text-xs text-zinc-500 truncate mb-2">{userProfile?.email}</p>
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {userProfile?.role === 'admin' ? 'Administrador' : userProfile?.role === 'manager' ? 'Gestor' : 'Colaborador'}
              </span>
            </div>
            
            {userProfile?.role === 'admin' && (
              <Link 
                href="/admin" 
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
              >
                <Shield size={16} className="text-indigo-400" /> Administração
              </Link>
            )}

            {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
              <Link 
                href="/reports" 
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors border-b border-zinc-800/50 mb-1 pb-3"
              >
                <TrendingUp size={16} className="text-emerald-400" /> Relatórios de Operação
              </Link>
            )}

            <Link 
              href="/settings" 
              onClick={() => setIsProfileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
            >
              <Settings size={16} /> Configurações Gerais
            </Link>
            
            <button 
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 mt-1 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={16} /> Sair do Sistema
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}