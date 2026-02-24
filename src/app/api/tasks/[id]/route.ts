import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// PATCH - Update a task
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

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

    // Build update object
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!["todo", "in_progress", "done"].includes(body.status)) {
        return NextResponse.json(
          { error: "Status must be 'todo', 'in_progress', or 'done'" },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    if (body.title !== undefined) {
      updates.title = body.title;
    }

    if (body.description !== undefined) {
      updates.description = body.description;
    }

    if (body.due_date !== undefined) {
      updates.due_date = body.due_date ? new Date(body.due_date).toISOString() : null;
    }

    if (body.reminder_time !== undefined) {
      // Validate time format (HH:MM)
      if (body.reminder_time === null || body.reminder_time === "") {
        updates.reminder_time = null;
      } else if (typeof body.reminder_time === "string") {
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (timeRegex.test(body.reminder_time.trim())) {
          updates.reminder_time = body.reminder_time.trim();
        } else {
          return NextResponse.json(
            { error: "reminder_time must be in HH:MM format" },
            { status: 400 }
          );
        }
      }
    }

    if (body.frequency_hours !== undefined || body.frequency_minutes !== undefined) {
      const hours = Math.max(0, Math.floor(Number(body.frequency_hours) || 0));
      const minutes = Math.max(0, Math.min(59, Math.floor(Number(body.frequency_minutes) || 0)));
      
      if (hours === 0 && minutes === 0) {
        updates.frequency_time = null;
      } else {
        // Store as "HH:MM" format for duration
        updates.frequency_time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
    }

    if (body.automation !== undefined) {
      updates.automation = body.automation;
    }

    if (body.next_run !== undefined) {
      updates.next_run = body.next_run ? new Date(body.next_run).toISOString() : null;
    }

    // Update task
    const { error: updateError } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id); // Ensure user owns the task

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update task: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
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

// DELETE - Delete a task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Delete task
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Ensure user owns the task

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete task: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
