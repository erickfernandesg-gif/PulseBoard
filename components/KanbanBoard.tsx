"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanTask } from "./KanbanTask";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

const COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

export function KanbanBoard({
  tasks,
  setTasks,
  profiles,
  onTaskUpdated,
  onTaskDeleted,
}: any) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeTask = useMemo(
    () => tasks.find((t: any) => t.id === activeId),
    [activeId, tasks],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    // Dropping a task over another task
    if (isActiveTask && isOverTask) {
      setTasks((tasks: any) => {
        const activeIndex = tasks.findIndex((t: any) => t.id === activeId);
        const overIndex = tasks.findIndex((t: any) => t.id === overId);

        if (tasks[activeIndex].status !== tasks[overIndex].status) {
          const updatedTasks = [...tasks];
          updatedTasks[activeIndex].status = tasks[overIndex].status;
          return arrayMove(updatedTasks, activeIndex, overIndex);
        }

        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    // Dropping a task over a column
    if (isActiveTask && isOverColumn) {
      setTasks((tasks: any) => {
        const activeIndex = tasks.findIndex((t: any) => t.id === activeId);
        const updatedTasks = [...tasks];
        updatedTasks[activeIndex].status = overId;
        return arrayMove(updatedTasks, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeIndex = tasks.findIndex((t: any) => t.id === activeId);
    const task = tasks[activeIndex];

    try {
      // Update in DB
      const { error } = await supabase
        .from("tasks")
        .update({ status: task.status, position_index: activeIndex })
        .eq("id", task.id);

      if (error) throw error;
    } catch (error: any) {
      toast.error("Failed to update task status");
      // Ideally revert state here
    }
  };

  return (
    <div className="flex h-full w-full overflow-x-auto p-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasks.filter((t: any) => t.status === col.id)}
              profiles={profiles}
              onTaskUpdated={onTaskUpdated}
              onTaskDeleted={onTaskDeleted}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId && activeTask ? (
            <KanbanTask task={activeTask} profiles={profiles} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
