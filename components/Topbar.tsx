"use client";

import { Bell, Search, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { MobileSidebar } from "./MobileSidebar";

export function Topbar({ user }: { user: any }) {
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 sm:px-6">
      <div className="flex flex-1 items-center">
        <MobileSidebar />
        <div className="relative w-full max-w-md hidden sm:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-zinc-500" aria-hidden="true" />
          </div>
          <input
            id="search"
            name="search"
            className="block w-full rounded-md border-0 bg-zinc-800/50 py-1.5 pl-10 pr-3 text-zinc-300 ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
            placeholder="Search tasks, boards..."
            type="search"
          />
        </div>
      </div>
      <div className="ml-4 flex items-center space-x-4">
        <button
          type="button"
          className="relative rounded-full bg-zinc-800 p-1 text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
        >
          <span className="absolute -inset-1.5" />
          <span className="sr-only">View notifications</span>
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Profile dropdown */}
        <div className="relative ml-3">
          <div>
            <button
              type="button"
              className="relative flex rounded-full bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              id="user-menu-button"
              aria-expanded="false"
              aria-haspopup="true"
              onClick={handleSignOut}
            >
              <span className="absolute -inset-1.5" />
              <span className="sr-only">Open user menu</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white">
                {user?.email?.charAt(0).toUpperCase() || <User size={16} />}
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
