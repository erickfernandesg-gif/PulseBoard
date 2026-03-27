"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  LayoutGrid, KanbanSquare, BarChart2, Settings, LogOut, 
  Workflow, FolderKanban, Shield, TrendingUp, ChevronLeft, ChevronRight 
} from "lucide-react";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

// Definindo a interface das Props recebidas do Layout
interface SidebarProps {
  userProfile: any;
  boards: any[];
}

export function Sidebar({ userProfile, boards = [] }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedState = localStorage.getItem("pulseboard_sidebar_collapsed");
    if (storedState) setIsCollapsed(JSON.parse(storedState));
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("pulseboard_sidebar_collapsed", JSON.stringify(newState));
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Erro ao encerrar sessão");
    }
  };

  const mainLinks = [
    { name: "Dashboard", href: "/", icon: LayoutGrid, roles: ["admin", "manager", "user"] },
    { name: "Meus Quadros", href: "/boards", icon: KanbanSquare, roles: ["admin", "manager", "user"] },
    { name: "Painel Executivo", href: "/executive", icon: TrendingUp, roles: ["admin", "manager"] },
    { name: "Relatórios", href: "/reports", icon: BarChart2, roles: ["admin", "manager", "user"] },
    { name: "Automações", href: "/automations", icon: Workflow, roles: ["admin", "manager", "user"] },
    { name: "Configurações", href: "/settings", icon: Settings, roles: ["admin", "manager", "user"] },
    { name: "Administração", href: "/admin", icon: Shield, roles: ["admin"] },
  ];

  const userRole = userProfile?.role || "user";
  const visibleLinks = mainLinks.filter(link => link.roles.includes(userRole));

  // Evita erros de hidratação no Next.js ao usar localStorage
  if (!isMounted) return <div className="hidden md:flex h-full w-64 bg-zinc-950 border-r border-zinc-800/50"></div>;

  return (
    <div className={cn(
      "hidden md:flex h-full flex-col bg-zinc-950 border-r border-zinc-800/50 transition-all duration-300 relative z-20",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Botão de Toggle */}
      <button 
        onClick={toggleCollapse}
        className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all shadow-md z-30 hover:scale-110"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header Logo */}
      <div className={cn("flex h-16 shrink-0 items-center border-b border-zinc-800/50 transition-all", isCollapsed ? "justify-center px-0" : "px-6")}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <FolderKanban className="h-4 w-4 text-white" />
          </div>
          {!isCollapsed && <span className="text-lg font-bold text-white tracking-tight truncate">PulseBoard</span>}
        </div>
      </div>

      {/* Menu Principal (Fixado no topo) */}
      <div className={cn("py-6 space-y-1 shrink-0", isCollapsed ? "px-2" : "px-4")}>
        {!isCollapsed && <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Menu Principal</p>}
        {visibleLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              title={isCollapsed ? link.name : ""}
              className={cn(
                "flex items-center rounded-lg transition-all group relative",
                isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2 text-sm font-medium",
                isActive ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200"
              )}
            >
              {isActive && !isCollapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 bg-indigo-500 rounded-r-full" />}
              
              <Icon size={isCollapsed ? 20 : 18} className={cn("shrink-0 transition-transform group-hover:scale-110", isActive ? "text-indigo-400" : "text-zinc-500")} />
              {!isCollapsed && <span>{link.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* Quadros (Com Scroll Independente) */}
      <div className={cn("flex-1 overflow-y-auto custom-scrollbar space-y-1 pb-4", isCollapsed ? "px-2" : "px-4")}>
        {!isCollapsed ? (
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 sticky top-0 bg-zinc-950 py-1 z-10">Meus Quadros</p>
        ) : (
          <div className="w-full flex justify-center mb-4"><div className="w-6 h-px bg-zinc-800"></div></div>
        )}
        
        {boards?.length === 0 ? (
          !isCollapsed && <p className="px-4 py-2 text-xs text-zinc-600 italic">Nenhum quadro ativo.</p>
        ) : (
          boards?.map((board) => {
            const href = `/boards/${board.id}`;
            const isActive = pathname === href;
            const firstLetter = board.name.charAt(0).toUpperCase();
            
            return (
              <Link
                key={board.id}
                href={href}
                title={isCollapsed ? board.name : ""}
                className={cn(
                  "flex items-center rounded-lg transition-all group relative",
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2 text-sm font-medium",
                  isActive ? "bg-zinc-800/80 text-white shadow-sm ring-1 ring-zinc-700/50" : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
                )}
              >
                {isActive && !isCollapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 bg-zinc-400 rounded-r-full" />}
                
                {isCollapsed ? (
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold transition-all",
                    isActive ? "bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]" : "bg-zinc-800 border border-zinc-700 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-white"
                  )}>
                    {firstLetter}
                  </div>
                ) : (
                  <>
                    <div className={cn("h-2 w-2 shrink-0 rounded-full transition-colors", isActive ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "bg-zinc-700 group-hover:bg-zinc-500")} />
                    <span className="truncate">{board.name}</span>
                  </>
                )}
              </Link>
            );
          })
        )}
      </div>

      {/* Footer: User & Logout */}
      <div className={cn("border-t border-zinc-800/50 p-4 shrink-0 transition-all bg-zinc-950/80 backdrop-blur-md", isCollapsed ? "flex flex-col items-center gap-3" : "")}>
        <div className={cn(
          "flex items-center rounded-xl transition-all",
          isCollapsed ? "p-0 justify-center" : "bg-zinc-900/40 border border-zinc-800/50 gap-3 p-3 mb-2"
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm uppercase shadow-sm" title={isCollapsed ? userProfile?.full_name : ""}>
            {userProfile?.full_name?.charAt(0) || userProfile?.email?.charAt(0) || "U"}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-bold text-white truncate">{userProfile?.full_name || "Usuário"}</span>
              <span className="text-[10px] text-zinc-500 truncate uppercase font-semibold">
                {userProfile?.role === 'admin' ? 'Administrador' : userProfile?.role === 'manager' ? 'Gestor' : 'Colaborador'}
              </span>
            </div>
          )}
        </div>
        
        <button
          onClick={handleLogout}
          title={isCollapsed ? "Sair" : ""}
          className={cn(
            "flex items-center font-medium text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 rounded-lg",
            isCollapsed ? "justify-center p-2.5 w-full mt-2" : "w-full justify-center gap-2 px-3 py-2 text-xs mt-1 border border-transparent hover:border-red-500/20"
          )}
        >
          <LogOut size={isCollapsed ? 18 : 14} className="shrink-0" />
          {!isCollapsed && <span>Sair do Sistema</span>}
        </button>
      </div>
    </div>
  );
}