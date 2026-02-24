"use client";

import { useState, useEffect, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { TaskCard } from "./TaskCard";
import { useNotifications } from "@/lib/use-notifications";
import { ReminderDialog } from "./ReminderDialog";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  due_date?: string | null;
  reminder_time?: string | null; // Format: "HH:MM" (time of day)
  frequency_time?: string | null; // Format: "HH:MM" (duration: hours and minutes)
  automation?: {
    frequency?: string;
    description?: string;
    email_subject?: string;
    email_body?: string;
  } | null;
  next_run?: string | null;
  created_at: string;
}

export function TasksClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isAutomating, setIsAutomating] = useState(false);
  const { showNotification } = useNotifications();
  const [reminderDialog, setReminderDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    taskId: string;
    onYes: () => void;
    onNo: () => void;
  } | null>(null);

  // Manual task form state
  const [manualTitle, setManualTitle] = useState("");
  const [manualDueDate, setManualDueDate] = useState("");
  const [manualReminderTime, setManualReminderTime] = useState("");
  const [manualFrequencyHours, setManualFrequencyHours] = useState("");
  const [manualFrequencyMinutes, setManualFrequencyMinutes] = useState("");
  const [manualStatus, setManualStatus] = useState<"todo" | "in_progress" | "done">("todo");

  // Automation form state
  const [automationDescription, setAutomationDescription] = useState("");

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
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
            onYes: async () => {
              // Mark as done
              const response = await fetch("/api/tasks/reminders/respond", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  task_id: reminder.id,
                  completed: true,
                }),
                credentials: "include",
              });

              if (response.ok) {
                toast.success("Task marked as done!");
                await fetchTasks();
              }
            },
            onNo: async () => {
              // Mark as in_progress
              const response = await fetch("/api/tasks/reminders/respond", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  task_id: reminder.id,
                  completed: false,
                }),
                credentials: "include",
              });

              if (response.ok) {
                toast.info("Task marked as in progress");
                await fetchTasks();
              }
            },
            onOpenDialog: () => {
              // Open dialog when notification is clicked
              setReminderDialog({
                open: true,
                title: `Task Reminder: ${reminder.title}`,
                description: reminder.description || "Time to check on this task!",
                taskId: reminder.id,
                onYes: async () => {
                  const response = await fetch("/api/tasks/reminders/respond", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      task_id: reminder.id,
                      completed: true,
                    }),
                    credentials: "include",
                  });

                  if (response.ok) {
                    toast.success("Task marked as done!");
                    await fetchTasks();
                  }
                },
                onNo: async () => {
                  const response = await fetch("/api/tasks/reminders/respond", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      task_id: reminder.id,
                      completed: false,
                    }),
                    credentials: "include",
                  });

                  if (response.ok) {
                    toast.info("Task marked as in progress");
                    await fetchTasks();
                  }
                },
              });
            },
          });
        }
      } catch (err) {
        // Silently fail - don't spam errors
      }
    };

    // Check immediately, then every 30 seconds
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
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTask() {
    if (!manualTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: manualTitle,
            due: manualDueDate || undefined,
            reminder_time: manualReminderTime || undefined,
            frequency_hours: manualFrequencyHours ? parseInt(manualFrequencyHours, 10) : undefined,
            frequency_minutes: manualFrequencyMinutes ? parseInt(manualFrequencyMinutes, 10) : undefined,
            status: manualStatus,
          }),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Try again");
          return;
        }

        setManualTitle("");
        setManualDueDate("");
        setManualReminderTime("");
        setManualFrequencyHours("");
        setManualFrequencyMinutes("");
        setManualStatus("todo");
        await fetchTasks();
        toast.success("Task created!");
      } catch (err) {
        toast.error("Try again");
      }
    });
  }

  async function handleAutomateTask() {
    if (!automationDescription.trim()) {
      toast.error("Please describe the automation");
      return;
    }

    setIsAutomating(true);
    try {
      const response = await fetch("/api/automate-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: automationDescription,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Try again");
        return;
      }

      setAutomationDescription("");
      await fetchTasks();
      toast.success("Automation created!");
    } catch (err) {
      toast.error("Try again");
    } finally {
      setIsAutomating(false);
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

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Tasks</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Manage your tasks and create automations for repetitive processes.
        </p>
      </div>

      {/* Manual Task Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Create Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm">Title</Label>
            <Input
              id="title"
              placeholder="Task title..."
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due-date">Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={manualDueDate}
                onChange={(e) => setManualDueDate(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={manualStatus}
                onValueChange={(value) =>
                  setManualStatus(value as "todo" | "in_progress" | "done")
                }
                disabled={isPending}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-time">Reminder Time</Label>
              <Input
                id="reminder-time"
                type="time"
                value={manualReminderTime}
                onChange={(e) => setManualReminderTime(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency-hours" className="text-xs">
                Frequency (Hrs)
              </Label>
              <Input
                id="frequency-hours"
                type="number"
                min="0"
                max="23"
                placeholder="0"
                value={manualFrequencyHours}
                onChange={(e) => setManualFrequencyHours(e.target.value)}
                disabled={isPending}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency-minutes" className="text-xs">
                Frequency (Min)
              </Label>
              <Input
                id="frequency-minutes"
                type="number"
                min="0"
                max="59"
                placeholder="0"
                value={manualFrequencyMinutes}
                onChange={(e) => setManualFrequencyMinutes(e.target.value)}
                disabled={isPending}
                className="w-full"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            How often to remind if task is still in progress
          </p>
          <Button
            onClick={handleCreateTask}
            disabled={isPending || !manualTitle.trim()}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Creating...
              </>
            ) : (
              "Create Task"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Automate Task */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Automate a Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="automation" className="text-sm">Describe automation in plain English</Label>
            <Textarea
              id="automation"
              placeholder="e.g., 'Send me a weekly reminder every Monday to review my goals'"
              value={automationDescription}
              onChange={(e) => setAutomationDescription(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={isAutomating}
            />
          </div>
          <Button
            onClick={handleAutomateTask}
            disabled={isAutomating || !automationDescription.trim()}
            className="w-full sm:w-auto"
          >
            {isAutomating ? (
              <>
                <Loader2Icon className="animate-spin" />
                Creating automation...
              </>
            ) : (
              "Create Automation"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Task Cards List */}
      <div className="space-y-4">
        <h2 className="text-base sm:text-lg font-semibold">Your Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks yet. Create your first task above.
          </p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
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
    </div>
  );
}
