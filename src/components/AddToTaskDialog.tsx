"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AddToTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle: string;
  onSuccess?: () => void;
}

export function AddToTaskDialog({
  open,
  onOpenChange,
  defaultTitle,
  onSuccess,
}: AddToTaskDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update title when defaultTitle changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
    }
  }, [defaultTitle, open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          status: "todo",
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create task");
        return;
      }

      toast.success("Task created!");
      onOpenChange(false);
      setTitle(defaultTitle);
      onSuccess?.();
    } catch (err) {
      toast.error("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Tasks</DialogTitle>
          <DialogDescription>
            Create a task from this result. You can edit the title below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isSubmitting) {
                  handleSubmit();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
