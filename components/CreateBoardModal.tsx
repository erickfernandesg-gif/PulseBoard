"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

export function CreateBoardModal({
  variant = "solid",
}: {
  variant?: "solid" | "outline";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("boards")
        .insert([{ name, description, owner_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Board created successfully");
      setIsOpen(false);
      setName("");
      setDescription("");
      router.push(`/boards/${data.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to create board");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50",
          variant === "solid"
            ? "bg-indigo-600 text-white hover:bg-indigo-500 h-10 px-4 py-2"
            : "border border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300 h-10 px-4 py-2",
        )}
      >
        <Plus className="mr-2 h-4 w-4" />
        New Board
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                Create New Board
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Board Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 bg-zinc-900 py-2 px-3 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                  placeholder="e.g. Q3 Marketing Campaign"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 bg-zinc-900 py-2 px-3 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 resize-none"
                  placeholder="What is this board for?"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
