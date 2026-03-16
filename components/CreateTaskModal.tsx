"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, X, Loader2, Calendar as CalendarIcon, User } from "lucide-react";
import { toast } from "sonner";

export function CreateTaskModal({
  boardId,
  profiles,
  onTaskCreated,
}: {
  boardId: string;
  profiles: any[];
  onTaskCreated: (task: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([
          {
            board_id: boardId,
            title,
            description,
            status,
            priority,
            assigned_to: assignedTo || null,
            due_date: dueDate || null,
          },
        ])
        .select("*, profiles(full_name, avatar_url)")
        .single();

      if (error) throw error;

      toast.success("Task created successfully");
      onTaskCreated(data);
      setIsOpen(false);
      // Reset form
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setAssignedTo("");
      setDueDate("");
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="mr-2 h-4 w-4" />
        New Task
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                Create New Task
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
                  htmlFor="title"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 bg-zinc-900 py-2 px-3 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                  placeholder="Task title"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 bg-zinc-900 py-2 px-3 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 resize-none"
                  placeholder="Add more details..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 block w-full rounded-md border-0 bg-zinc-900 py-2 pl-3 pr-10 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="priority"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="mt-1 block w-full rounded-md border-0 bg-zinc-900 py-2 pl-3 pr-10 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="assignee"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    Assignee
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-4 w-4 text-zinc-500" />
                    </div>
                    <select
                      id="assignee"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="block w-full rounded-md border-0 bg-zinc-900 py-2 pl-10 pr-10 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 appearance-none"
                    >
                      <option value="">Unassigned</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="dueDate"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    Due Date
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <CalendarIcon className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                      type="date"
                      id="dueDate"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="block w-full rounded-md border-0 bg-zinc-900 py-2 pl-10 pr-3 text-white ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-zinc-800">
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
