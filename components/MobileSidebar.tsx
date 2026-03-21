"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutGrid, KanbanSquare, TrendingUp, BarChart2, Workflow, Settings, Shield } from "lucide-react";
import { cn } from "@/utils/cn";
import { createClient } from "@/utils/supabase/client";

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("user");
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function getUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (profile) setUserRole(profile.role || "user");
      }
    }
    getUserRole();
  }, [supabase]);

  // A mesma definição segura de rotas que usamos no Sidebar Desktop
  const mainLinks = [
    { name: "Dashboard", href: "/", icon: LayoutGrid, roles: ["admin", "manager", "user"] },
    { name: "Meus Quadros", href: "/boards", icon: KanbanSquare, roles: ["admin", "manager", "user"] },
    { name: "Painel Executivo", href: "/executive", icon: TrendingUp, roles: ["admin", "manager"] },
    { name: "Relatórios", href: "/reports", icon: BarChart2, roles: ["admin", "manager", "user"] },
    { name: "Automações", href: "/automations", icon: Workflow, roles: ["admin", "manager", "user"] },
    { name: "Configurações", href: "/settings", icon: Settings, roles: ["admin", "manager", "user"] },
    { name: "Administração", href: "/admin", icon: Shield, roles: ["admin"] },
  ];

  // Filtra o menu com base no cargo do usuário logado
  const visibleLinks = mainLinks.filter(link => link.roles.includes(userRole));

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="mr-4 rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white md:hidden"
      >
        <Menu size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-zinc-950 pt-5 pb-4">
            <div className="absolute right-0 top-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-zinc-500"
                onClick={() => setIsOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-shrink-0 items-center px-4">
              <span className="text-xl font-bold tracking-tight text-white">
                PulseBoard
              </span>
            </div>
            
            <div className="mt-8 h-0 flex-1 overflow-y-auto">
              <nav className="space-y-1 px-2">
                {visibleLinks.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "group flex items-center rounded-md px-2 py-3 text-base font-medium transition-colors",
                        isActive
                          ? "bg-indigo-500/10 text-indigo-400"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                      )}
                    >
                      <Icon
                        className={cn(
                          "mr-4 h-6 w-6 flex-shrink-0",
                          isActive
                            ? "text-indigo-400"
                            : "text-zinc-400 group-hover:text-white"
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}