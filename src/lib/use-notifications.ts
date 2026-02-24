"use client";

import { useEffect, useCallback } from "react";
import { toast } from "sonner";

export function useNotifications() {
  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission === "denied") {
      toast.error("Notification permission denied. Please enable it in your browser settings.");
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }, []);

  // Show notification with action buttons
  const showNotification = useCallback(
    async (
      title: string,
      options: NotificationOptions & {
        taskId: string;
        onYes?: () => void;
        onNo?: () => void;
        onOpenDialog?: () => void;
      }
    ) => {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return;
      }

      const { taskId, onYes, onNo, onOpenDialog, ...notificationOptions } = options;

      // Create notification
      const notification = new Notification(title, {
        ...notificationOptions,
        requireInteraction: true, // Keep notification visible until user interacts
        tag: `task-${taskId}`, // Prevent duplicate notifications
      });

      // Handle notification click - open dialog
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Open dialog if callback provided, otherwise use confirm
        if (onOpenDialog) {
          onOpenDialog();
        } else {
          const confirmed = confirm(
            `${title}\n\n${notificationOptions.body || ""}\n\nIs this task completed? (OK = Yes, Cancel = No)`
          );
          
          if (confirmed && onYes) {
            onYes();
          } else if (!confirmed && onNo) {
            onNo();
          }
        }
      };

      // Handle notification close (user dismissed) - mark as in_progress
      notification.onclose = () => {
        // If user dismissed without responding, mark as in_progress
        if (onNo) {
          onNo();
        }
      };
    },
    [requestPermission]
  );

  return { requestPermission, showNotification };
}
