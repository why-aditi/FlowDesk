import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// POST - Handle notification response (yes = done, no = in_progress)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskId = body.task_id;
    const completed = body.completed; // true = yes, false = no

    if (typeof taskId !== "string" || taskId.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty 'task_id' field in request body" },
        { status: 400 }
      );
    }

    if (typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Missing or invalid 'completed' field (must be boolean)" },
        { status: 400 }
      );
    }

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

    // Update task status based on response
    const newStatus = completed ? "done" : "in_progress";

    // Build update object
    const updates: Record<string, unknown> = {
      status: newStatus,
    };

    const { error: updateError } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .eq("user_id", user.id); // Ensure user owns the task

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update task: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, status: newStatus },
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
