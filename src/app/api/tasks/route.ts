import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET - Fetch all tasks for the user
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch tasks: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks: data ?? [] }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST - Create a new task
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = body.title || body.task; // Support both 'title' and 'task' for backward compatibility
    const owner = body.owner;
    const due = body.due;
    const reminder_time = body.reminder_time; // Format: "HH:MM" (e.g., "14:30")
    const frequency_hours = body.frequency_hours; // Number of hours
    const frequency_minutes = body.frequency_minutes; // Number of minutes

    if (typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty 'title' or 'task' field in request body" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse due date if provided
    let dueDate: string | null = null;
    if (due && typeof due === "string") {
      try {
        // Validate date format
        const date = new Date(due);
        if (!isNaN(date.getTime())) {
          dueDate = date.toISOString();
        }
      } catch {
        // Invalid date, leave as null
      }
    }

    // Parse reminder time if provided (time format: HH:MM)
    let reminderTime: string | null = null;
    if (reminder_time && typeof reminder_time === "string") {
      // Validate time format (HH:MM)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (timeRegex.test(reminder_time.trim())) {
        reminderTime = reminder_time.trim();
      }
    }

    // Parse frequency duration if provided (hours and minutes)
    let frequencyTime: string | null = null;
    if (
      (frequency_hours !== undefined && frequency_hours !== null) ||
      (frequency_minutes !== undefined && frequency_minutes !== null)
    ) {
      const hours = Math.max(0, Math.floor(Number(frequency_hours) || 0));
      const minutes = Math.max(0, Math.min(59, Math.floor(Number(frequency_minutes) || 0)));
      
      if (hours > 0 || minutes > 0) {
        // Store as "HH:MM" format for duration
        frequencyTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
    }

    // Parse status if provided
    const status = body.status || "todo";
    if (!["todo", "in_progress", "done"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'todo', 'in_progress', or 'done'" },
        { status: 400 }
      );
    }

    // Create task in Supabase
    const { error: insertError } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: title,
      description: owner ? `Owner: ${owner}` : undefined,
      due_date: dueDate,
      reminder_time: reminderTime,
      frequency_time: frequencyTime,
      status: status,
    });

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create task: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
