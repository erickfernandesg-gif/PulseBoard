import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { BoardClient } from "@/components/BoardClient";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("*")
    .eq("id", id)
    .single();

  if (boardError || !board) {
    notFound();
  }

  // Fetch initial tasks
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("*, profiles(full_name, avatar_url)")
    .eq("board_id", id)
    .order("position_index", { ascending: true });

  // Fetch profiles for assignment
  const { data: profiles } = await supabase.from("profiles").select("*");

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {board.name}
          </h1>
          {board.description && (
            <p className="mt-1 text-sm text-zinc-400">{board.description}</p>
          )}
        </div>
      </div>

      <BoardClient
        board={board}
        initialTasks={tasks || []}
        profiles={profiles || []}
      />
    </div>
  );
}
