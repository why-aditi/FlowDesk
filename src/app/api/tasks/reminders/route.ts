import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// Helper function to convert HH:MM to minutes since midnight
function timeToMinutes(time: string): number | null {
  if (!time || typeof time !== "string") return null;
  const parts = time.split(":");
  if (parts.length !== 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

// Helper function to get current time in HH:MM format
function getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Helper function to add time (HH:MM) to a timestamp
function addTimeToTimestamp(timestamp: string, timeToAdd: string): Date | null {
  if (!timestamp || !timeToAdd) return null;
  const baseDate = new Date(timestamp);
  if (isNaN(baseDate.getTime())) return null;
  
  const parts = timeToAdd.split(":");
  if (parts.length !== 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (isNaN(hours) || isNaN(minutes)) return null;
  
  baseDate.setHours(baseDate.getHours() + hours);
  baseDate.setMinutes(baseDate.getMinutes() + minutes);
  return baseDate;
}

// GET - Fetch tasks that need reminders
export async function GET() {
  try {
    let supabase;
    try {
      supabase = await createServerClient();
    } catch (clientErr) {
      console.error("Error creating Supabase client:", clientErr);
      return NextResponse.json(
        { error: `Failed to initialize client: ${clientErr instanceof Error ? clientErr.message : "Unknown error"}` },
        { status: 500 }
      );
    }

    let user, userError;
    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
      userError = result.error;
    } catch (authErr) {
      console.error("Error getting user:", authErr);
      return NextResponse.json(
        { error: `Failed to authenticate: ${authErr instanceof Error ? authErr.message : "Unknown error"}` },
        { status: 500 }
      );
    }

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentTime = getCurrentTime();
    const currentMinutes = timeToMinutes(currentTime);
    if (currentMinutes === null) {
      return NextResponse.json(
        { error: "Failed to parse current time" },
        { status: 500 }
      );
    }

    // Fetch tasks with reminders that are not done
    let tasks: any[] = [];
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, reminder_time, frequency_time, status, last_reminder_sent")
        .eq("user_id", user.id)
        .not("reminder_time", "is", null)
        .neq("status", "done")
        .order("reminder_time", { ascending: true });

      if (error) {
        console.error("Supabase query error:", error);
        return NextResponse.json(
          { error: `Failed to fetch reminders: ${error.message}` },
          { status: 500 }
        );
      }

      tasks = Array.isArray(data) ? data : [];
    } catch (queryErr) {
      console.error("Error executing Supabase query:", queryErr);
      return NextResponse.json(
        { error: `Query failed: ${queryErr instanceof Error ? queryErr.message : "Unknown error"}` },
        { status: 500 }
      );
    }

    if (tasks.length === 0) {
      return NextResponse.json({ reminders: [] }, { status: 200 });
    }

    // Filter tasks that need reminders
    const reminders = tasks.filter((task) => {
      try {
        // Validate task has required fields
        if (!task || !task.reminder_time) {
          return false;
        }

        // Ensure reminder_time is a valid string
        if (typeof task.reminder_time !== "string") {
          return false;
        }
        const reminderTimeStr = task.reminder_time.trim();
        const reminderMinutes = timeToMinutes(reminderTimeStr);
        if (reminderMinutes === null) return false; // Invalid time format

        // Validate status
        if (!task.status || !["todo", "in_progress", "done"].includes(task.status)) {
          return false;
        }

        // Check if it's time for the initial reminder
        if (!task.last_reminder_sent) {
          // Check if current time matches or has passed reminder time
          return currentMinutes >= reminderMinutes;
        }

        // If task is in_progress and has frequency_time, check if frequency has passed
        if (task.status === "in_progress" && task.frequency_time) {
          // Convert last_reminder_sent to string (handles Date objects, timestamps, etc.)
          let lastReminderStr: string;
          if (task.last_reminder_sent instanceof Date) {
            lastReminderStr = task.last_reminder_sent.toISOString();
          } else if (typeof task.last_reminder_sent === "string") {
            lastReminderStr = task.last_reminder_sent;
          } else {
            lastReminderStr = String(task.last_reminder_sent);
          }
          
          const lastReminderDate = new Date(lastReminderStr);
          if (isNaN(lastReminderDate.getTime())) return false; // Invalid date
          
          // Ensure frequency_time is a valid string
          if (typeof task.frequency_time !== "string") {
            return false;
          }
          const frequencyTimeStr = task.frequency_time.trim();
          const nextReminderDate = addTimeToTimestamp(
            lastReminderStr,
            frequencyTimeStr
          );
          if (!nextReminderDate) return false; // Invalid time format or date
          
          const now = new Date();

          // Check if frequency time has passed since last reminder
          return now >= nextReminderDate;
        }

        // For todo tasks, only show if it's the initial reminder time
        if (task.status === "todo") {
          return currentMinutes >= reminderMinutes && !task.last_reminder_sent;
        }

        return false;
      } catch (err) {
        // Skip tasks with invalid data
        return false;
      }
    });

    return NextResponse.json({ reminders: reminders || [] }, { status: 200 });
  } catch (err) {
    // Log the error for debugging
    console.error("Error in /api/tasks/reminders:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json(
      { 
        error: message,
        ...(process.env.NODE_ENV === "development" && stack ? { stack } : {})
      },
      { status: 500 }
    );
  }
}
