"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { MoreHorizontal, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { TaskDetailsModal } from "./TaskDetailsModal";

export function TableBoard({
  tasks,
  setTasks,
  profiles,
  onTaskUpdated,
  onTaskDeleted,
}: any) {
  const supabase = createClient();
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId)
        .select("*, profiles(full_name, avatar_url)")
        .single();

      if (error) throw error;

      onTaskUpdated(data);
      toast.success("Task status updated");
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const priorityColors: Record<string, string> = {
    low: "bg-zinc-800 text-zinc-300",
    medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    urgent: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="h-full w-full overflow-auto">
      <table className="min-w-full divide-y divide-zinc-800">
        <thead className="bg-zinc-900/50 sticky top-0 z-10">
          <tr>
            <th
              scope="col"
              className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-zinc-300 sm:pl-6"
            >
              Task
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-300"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-300"
            >
              Priority
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-300"
            >
              Assignee
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-300"
            >
              Due Date
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 bg-zinc-950">
          {tasks.map((task: any) => (
            <tr
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="hover:bg-zinc-900/50 transition-colors cursor-pointer"
            >
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                <div className="font-medium text-white">{task.title}</div>
                {task.description && (
                  <div className="text-zinc-500 truncate max-w-xs">
                    {task.description}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                  className="rounded-md border-0 bg-zinc-800 py-1 pl-2 pr-8 text-white ring-1 ring-inset ring-zinc-700 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-xs sm:leading-6"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
                    priorityColors[task.priority] || priorityColors.medium,
                  )}
                >
                  {task.priority}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-400">
                <div className="flex items-center">
                  {task.profiles ? (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-medium text-white mr-2">
                        {task.profiles.full_name?.charAt(0) || (
                          <User size={12} />
                        )}
                      </div>
                      {task.profiles.full_name || task.profiles.email}
                    </>
                  ) : (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-zinc-500 mr-2">
                        <User size={12} />
                      </div>
                      Unassigned
                    </>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-400">
                <div className="flex items-center">
                  <Calendar className="mr-1.5 h-4 w-4 text-zinc-500" />
                  {task.due_date
                    ? format(new Date(task.due_date), "MMM d, yyyy")
                    : "No date"}
                </div>
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6" onClick={(e) => e.stopPropagation()}>
                <button className="text-zinc-400 hover:text-white">
                  <MoreHorizontal className="h-5 w-5" />
                  <span className="sr-only">Options for {task.title}</span>
                </button>
              </td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="py-8 text-center text-sm text-zinc-500"
              >
                No tasks found. Create one to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {selectedTask && (
        <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
