"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LayoutGrid, KanbanSquare, TrendingUp, BarChart2, Workflow, Settings, Shield, FolderKanban, LogOut } from "lucide-react";
import { cn } from "@/utils/cn";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface MobileSidebarProps {
  userProfile: any;
  boards: any[];
}

export function MobileSidebar({ userProfile, boards }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

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

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800/80 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all shadow-sm active:scale-95"
      >
        <Menu size={20} />
      </button>

      <div className={cn(
        "fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity duration-300 md:hidden",
        isOpen ? "opacity-100 visible" : "opacity-0 invisible"
      )} onClick={() => setIsOpen(false)} />

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-zinc-950 border-r border-zinc-800/80 transition-transform duration-300 ease-out md:hidden shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <FolderKanban className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">PulseBoard</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col py-6">
          <div className="px-4 space-y-1 mb-6">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Principal</p>
            {visibleLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all group relative",
                    isActive ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  )}
                >
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 bg-indigo-500 rounded-r-full" />}
                  <Icon size={18} className={cn("transition-colors", isActive ? "text-indigo-400" : "text-zinc-500")} />
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="px-4 space-y-1 flex-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Meus Quadros</p>
            {boards.length === 0 ? (
              <p className="px-4 py-2 text-xs text-zinc-600 italic">Nenhum quadro criado.</p>
            ) : (
              boards.map((board) => {
                const href = `/boards/${board.id}`;
                const isActive = pathname === href;
                return (
                  <Link
                    key={board.id}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all relative",
                      isActive ? "bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    )}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 bg-zinc-400 rounded-r-full" />}
                    <div className={cn("h-2 w-2 rounded-full shrink-0", isActive ? "bg-indigo-500" : "bg-zinc-700")} />
                    <span className="truncate">{board.name}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="border-t border-zinc-800/50 p-4 bg-zinc-950/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 rounded-xl bg-zinc-900/40 p-3 mb-2 border border-zinc-800/50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm uppercase shadow-sm">
              {userProfile?.full_name?.charAt(0) || userProfile?.email?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-bold text-white truncate">{userProfile?.full_name || "Usuário"}</span>
              <span className="text-[10px] text-zinc-500 truncate uppercase font-semibold">
                {userProfile?.role === 'admin' ? 'Administrador' : userProfile?.role === 'manager' ? 'Gestor' : 'Colaborador'}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => { setIsOpen(false); handleLogout(); }}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20"
          >
            <LogOut size={16} />
            Sair do Sistema
          </button>
        </div>
      </div>
    </>
  );
}