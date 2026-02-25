"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onYes: () => void;
  onNo: () => void;
}

export function ReminderDialog({
  open,
  onOpenChange,
  title,
  description,
  onYes,
  onNo,
}: ReminderDialogProps) {
  const handleYes = () => {
    onYes();
    onOpenChange(false);
  };

  const handleNo = () => {
    onNo();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Is this task completed?
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleNo}
              className="flex items-center gap-2"
            >
              <X className="size-4" />
              No
            </Button>
            <Button
              onClick={handleYes}
              className="flex items-center gap-2"
            >
              <Check className="size-4" />
              Yes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
