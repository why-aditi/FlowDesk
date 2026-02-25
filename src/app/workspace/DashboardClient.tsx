"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TaskCard } from "./tasks/TaskCard";
import { useNotifications } from "@/lib/use-notifications";
import { toast } from "sonner";
import { ReminderDialog } from "./tasks/ReminderDialog";
import { createBrowserClient } from "@/lib/supabase";
import { Sparkles } from "lucide-react";
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

function getHourKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:00:00`;
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
  const [plannerStats, setPlannerStats] = useState<{
    total: number;
    completed: number;
    percentage: number;
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

  // Fetch planner stats
  useEffect(() => {
    const fetchPlannerStats = async () => {
      try {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        // Fetch all planner slots for statistics (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoKey = getHourKey(thirtyDaysAgo);

        const { data: allSlotsForStats } = await supabase
          .from("planner_slots")
          .select("is_done")
          .eq("user_id", user.id)
          .gte("hour", thirtyDaysAgoKey);

        // Calculate completion statistics
        if (allSlotsForStats) {
          const total = allSlotsForStats.length;
          const completed = allSlotsForStats.filter((slot) => slot.is_done).length;
          const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
          setPlannerStats({ total, completed, percentage });
        }
      } catch (err) {
        // Silently fail
      }
    };

    fetchPlannerStats();
  }, []);

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
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
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
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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

        {/* Desktop Planner Progress - hidden on mobile */}
        <Card className="hidden lg:block">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg sm:text-xl">Planner Progress</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Your hourly planning completion rate
                  </CardDescription>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link href="/workspace/planner">View Planner</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {plannerStats === null ? (
              <p className="text-sm text-muted-foreground">Loading planner stats...</p>
            ) : plannerStats.total === 0 ? (
              <p className="text-sm text-muted-foreground">
                No planner data yet. Start planning your hours in the Planner section.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Last 30 days</span>
                    <span className="font-bold text-base sm:text-lg">{plannerStats.percentage}%</span>
                  </div>
                  <Progress value={plannerStats.percentage} className="h-3 sm:h-4" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{plannerStats.completed} completed</span>
                    <span>{plannerStats.total} total</span>
                  </div>
                </div>
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-semibold text-green-600 dark:text-green-400 text-sm sm:text-base">
                      {plannerStats.completed}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400 text-sm sm:text-base">
                      {plannerStats.total - plannerStats.completed}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

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
