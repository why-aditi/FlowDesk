"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./tasks/TaskCard";
import { useNotifications } from "@/lib/use-notifications";
import { toast } from "sonner";
import { ReminderDialog } from "./tasks/ReminderDialog";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  due_date?: string | null;
  reminder_time?: string | null;
  frequency_time?: string | null;
  automation?: {
    frequency?: string;
    description?: string;
    email_subject?: string;
    email_body?: string;
  } | null;
  next_run?: string | null;
  created_at: string;
}

interface DashboardClientProps {
  initialTasks: Task[];
}

export function DashboardClient({ initialTasks }: DashboardClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const { showNotification } = useNotifications();
  const [reminderDialog, setReminderDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    taskId: string;
    onYes: () => void;
    onNo: () => void;
  } | null>(null);

  // Centralized handler for reminder responses
  async function respondToReminder(taskId: string, completed: boolean) {
    const response = await fetch("/api/tasks/reminders/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ task_id: taskId, completed }),
      credentials: "include",
    });

    if (response.ok) {
      if (completed) {
        toast.success("Task marked as done!");
      } else {
        toast.info("Task marked as in progress");
      }
      await fetchTasks();
    }
  }

  // Poll for reminders every 30 seconds
  useEffect(() => {
    const checkReminders = async () => {
      try {
        const response = await fetch("/api/tasks/reminders", {
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const reminders = data.reminders || [];

        for (const reminder of reminders) {
          // Show notification
          await showNotification(`Task Reminder: ${reminder.title}`, {
            body: reminder.description || "Time to check on this task!",
            taskId: reminder.id,
            onYes: () => respondToReminder(reminder.id, true),
            onNo: () => respondToReminder(reminder.id, false),
            onOpenDialog: () => {
              setReminderDialog({
                open: true,
                title: `Task Reminder: ${reminder.title}`,
                description: reminder.description || "Time to check on this task!",
                taskId: reminder.id,
                onYes: () => respondToReminder(reminder.id, true),
                onNo: () => respondToReminder(reminder.id, false),
              });
            },
          });
        }
      } catch (err) {
        // Silently fail
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);

    return () => clearInterval(interval);
  }, [showNotification]);

  async function fetchTasks() {
    try {
      const response = await fetch("/api/tasks", {
        credentials: "include",
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      // Silently fail
    }
  }

  async function handleStatusChange(id: string, newStatus: "todo" | "in_progress" | "done") {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include",
      });

      if (!response.ok) {
        toast.error("Failed to update status");
        return;
      }

      await fetchTasks();
      toast.success("Status updated!");
    } catch (err) {
      toast.error("Try again");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        toast.error("Failed to delete task");
        return;
      }

      await fetchTasks();
      toast.success("Task deleted!");
    } catch (err) {
      toast.error("Try again");
    }
  }

  // Filter tasks to show only active ones (not done)
  const activeTasks = tasks.filter((task) => task.status !== "done").slice(0, 5);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl">Your Tasks</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Active tasks that need your attention
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link href="/workspace/tasks">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active tasks. Create your first task in the Tasks section.
            </p>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {activeTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Dialog */}
      {reminderDialog && (
        <ReminderDialog
          open={reminderDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setReminderDialog(null);
            } else {
              setReminderDialog({ ...reminderDialog, open });
            }
          }}
          title={reminderDialog.title}
          description={reminderDialog.description}
          onYes={reminderDialog.onYes}
          onNo={reminderDialog.onNo}
        />
      )}
    </>
  );
}
