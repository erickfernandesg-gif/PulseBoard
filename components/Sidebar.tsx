"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  LayoutGrid, 
  KanbanSquare, 
  BarChart2, 
  Settings, 
  LogOut, 
  Workflow, 
  Loader2,
  FolderKanban
} from "lucide-react";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const [boards, setBoards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    async function fetchSidebarData() {
      setIsLoading(true);
      
      // 1. Busca os dados do usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setUserProfile(profile || { full_name: user.email, email: user.email });
      }

      // 2. Busca todos os quadros para o menu lateral
      const { data: boardsData } = await supabase
        .from("boards")
        .select("id, name")
        .order("created_at", { ascending: false });
        
      if (boardsData) setBoards(boardsData);
      
      setIsLoading(false);
    }

    fetchSidebarData();
  }, [supabase]);

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
    { name: "Dashboard", href: "/", icon: LayoutGrid },
    { name: "Meus Quadros", href: "/boards", icon: KanbanSquare },
    { name: "Relatórios", href: "/reports", icon: BarChart2 },
    { name: "Automações", href: "/automations", icon: Workflow },
    { name: "Configurações", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-zinc-950 border-r border-zinc-800/50">
      {/* Logo Area */}
      <div className="flex h-16 items-center px-6 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <FolderKanban className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">PulseBoard</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 custom-scrollbar flex flex-col gap-8">
        
        {/* Menu Principal */}
        <div className="px-4 space-y-1">
          <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Principal</p>
          {mainLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            const Icon = link.icon;
            
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-indigo-500/10 text-indigo-400" 
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                )}
              >
                <Icon size={18} className={cn("transition-colors", isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Dinâmico: Ecossistemas (Quadros) */}
        <div className="px-4 space-y-1 flex-1">
          <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Meus Ecossistemas</p>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
            </div>
          ) : boards.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-600 italic">Nenhum quadro criado.</p>
          ) : (
            boards.map((board) => {
              const href = `/boards/${board.id}`;
              const isActive = pathname === href;
              
              return (
                <Link
                  key={board.id}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all group",
                    isActive 
                      ? "bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700" 
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  )}
                >
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    isActive ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "bg-zinc-700 group-hover:bg-zinc-500"
                  )} />
                  <span className="truncate">{board.name}</span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* User Area & Logout */}
      <div className="border-t border-zinc-800/50 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-zinc-900/50 p-3 mb-2 border border-zinc-800/50">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
            {userProfile?.full_name?.charAt(0).toUpperCase() || userProfile?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-bold text-white truncate">
              {userProfile?.full_name || "Usuário"}
            </span>
            <span className="text-[10px] text-zinc-500 truncate">
              {userProfile?.email}
            </span>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={16} />
          Encerrar Sessão
        </button>
      </div>
    </div>
  );
}