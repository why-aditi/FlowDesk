"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: string, newStatus: "todo" | "in_progress" | "done") => void;
  onDelete: (id: string) => void;
}

function getStatusColor(status: "todo" | "in_progress" | "done") {
  switch (status) {
    case "todo":
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
    case "in_progress":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "done":
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
  }
}

function getNextStatus(currentStatus: "todo" | "in_progress" | "done"): "todo" | "in_progress" | "done" {
  switch (currentStatus) {
    case "todo":
      return "in_progress";
    case "in_progress":
      return "done";
    case "done":
      return "todo";
  }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

export function TaskCard({ task, onStatusChange, onDelete }: TaskCardProps) {
  const nextStatus = getNextStatus(task.status);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("border font-medium", getStatusColor(task.status))}
            >
              {task.status === "in_progress" ? "In Progress" : task.status.toUpperCase()}
            </Badge>
            {task.automation && (
              <Badge variant="secondary" className="text-xs break-words">
                🤖 {task.automation.description || "Automated"}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-foreground break-words">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">{task.description}</p>
          )}
          {task.due_date && (
            <p className="text-xs text-muted-foreground">
              Due: {formatDate(task.due_date)}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(task.id)}
          className="shrink-0"
          aria-label="Delete task"
        >
          <Trash2 className="size-4" />
        </Button>
      </CardHeader>
      {task.status !== "done" && (
        <CardContent>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onStatusChange(task.id, nextStatus)}
            className="w-full"
          >
            Mark as {nextStatus === "in_progress" ? "In Progress" : nextStatus.toUpperCase()}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
