"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { navItems } from "./Sidebar";

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
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
            <div className="mt-5 h-0 flex-1 overflow-y-auto">
              <nav className="space-y-1 px-2">
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "group flex items-center rounded-md px-2 py-2 text-base font-medium transition-colors",
                        isActive
                          ? "bg-indigo-500/10 text-indigo-400"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "mr-4 h-6 w-6 flex-shrink-0",
                          isActive
                            ? "text-indigo-400"
                            : "text-zinc-400 group-hover:text-white",
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
