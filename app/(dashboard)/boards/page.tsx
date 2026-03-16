import { createClient } from "@/utils/supabase/server";
import { Plus, LayoutDashboard, MoreVertical } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CreateBoardModal } from "@/components/CreateBoardModal";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: boards, error } = await supabase
    .from("boards")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Quadros
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gerencie seus quadros operacionais e projetos.
          </p>
        </div>
        <div className="w-full sm:w-auto flex justify-center">
          <CreateBoardModal />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {boards?.map((board) => (
          <Link
            key={board.id}
            href={`/boards/${board.id}`}
            className="group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm transition-all hover:border-indigo-500/50 hover:bg-zinc-800/80"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                  <LayoutDashboard size={20} />
                </div>
                <button className="text-zinc-500 hover:text-zinc-300">
                  <MoreVertical size={16} />
                </button>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                {board.name}
              </h3>
              <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
                {board.description || "No description provided."}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-zinc-500">
              <span>
                Updated{" "}
                {formatDistanceToNow(new Date(board.created_at), {
                  addSuffix: true,
                })}
              </span>
              <div className="flex -space-x-2">
                {/* Placeholder for team members */}
                <div className="h-6 w-6 rounded-full border-2 border-zinc-900 bg-zinc-700" />
                <div className="h-6 w-6 rounded-full border-2 border-zinc-900 bg-zinc-600" />
              </div>
            </div>
          </Link>
        ))}

        {(!boards || boards.length === 0) && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 py-12 text-center">
            <LayoutDashboard className="mx-auto h-12 w-12 text-zinc-600" />
            <h3 className="mt-4 text-sm font-semibold text-white">No boards</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Get started by creating a new board.
            </p>
            <div className="mt-6">
              <CreateBoardModal variant="outline" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
