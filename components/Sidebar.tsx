"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Briefcase,
  BarChart3,
  PieChart,
  Zap,
  FileText,
  Users,
  UserCircle
} from "lucide-react";
import { cn } from "@/utils/cn";

export const navItems = [
  { name: "Meu Trabalho", href: "/", icon: Briefcase },
  { name: "Quadros", href: "/boards", icon: KanbanSquare },
  { name: "Painel Executivo", href: "/executive", icon: BarChart3 },
  { name: "Relatórios", href: "/reports", icon: PieChart },
  { name: "Automações", href: "/automations", icon: Zap },
  { name: "Formulários", href: "/forms", icon: FileText },
  { name: "Administração", href: "/admin", icon: Users },
  { name: "Configurações", href: "/settings", icon: UserCircle },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "relative hidden md:flex flex-col border-r border-zinc-800 bg-zinc-900/50 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        {!isCollapsed && (
          <span className="text-lg font-bold tracking-tight text-white">
            PulseBoard
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white",
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive
                    ? "text-indigo-400"
                    : "text-zinc-400 group-hover:text-white",
                  isCollapsed && "mr-0",
                )}
                aria-hidden="true"
              />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {!isCollapsed && (
        <div className="p-4">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-4 border border-indigo-500/20">
            <h3 className="text-sm font-semibold text-white">Pro Plan</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Unlock advanced features.
            </p>
            <button className="mt-3 w-full rounded-md bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors">
              Upgrade
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
