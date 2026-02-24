import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  // Verify cron secret if set
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const supabase = await createServerClient();

    // Fetch tasks where next_run <= NOW() and automation is set
    const now = new Date().toISOString();
    const { data: tasks, error: fetchError } = await supabase
      .from("tasks")
      .select("id, user_id, title, automation")
      .not("automation", "is", null)
      .lte("next_run", now)
      .neq("status", "done");

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch tasks: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json(
        { ok: true, processed: 0 },
        { status: 200 }
      );
    }

    let processed = 0;
    const errors: string[] = [];

    for (const task of tasks) {
      try {
        const automation = task.automation as {
          frequency?: string;
          description?: string;
          email_subject?: string;
          email_body?: string;
        };

        // Send email if configured
        if (automation.email_subject && automation.email_body) {
          // Fetch user email from users table
          const { data: userData } = await supabase
            .from("users")
            .select("email")
            .eq("id", task.user_id)
            .single();
          
          const userEmail = userData?.email;
          
          if (userEmail) {
            try {
              await resend.emails.send({
                from: process.env.RESEND_FROM || "FlowDesk <onboarding@resend.dev>",
                to: userEmail,
                subject: automation.email_subject,
                html: automation.email_body,
              });
            } catch (emailError) {
              errors.push(`Failed to send email for task ${task.id}: ${emailError instanceof Error ? emailError.message : String(emailError)}`);
              continue;
            }
          }
        }

        // Calculate next_run based on frequency
        const frequency = automation.frequency || "daily";
        const nextRun = calculateNextRun(frequency);

        // Update task with new next_run
        const { error: updateError } = await supabase
          .from("tasks")
          .update({ next_run: nextRun.toISOString() })
          .eq("id", task.id);

        if (updateError) {
          errors.push(`Failed to update task ${task.id}: ${updateError.message}`);
          continue;
        }

        processed++;
      } catch (err) {
        errors.push(`Error processing task ${task.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        processed,
        total: tasks.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

function calculateNextRun(frequency: string): Date {
  const now = new Date();
  const lowerFreq = frequency.toLowerCase().trim();

  if (lowerFreq === "daily" || lowerFreq === "every day") {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    return next;
  }

  if (lowerFreq === "weekly" || lowerFreq === "every week") {
    const next = new Date(now);
    next.setDate(next.getDate() + 7);
    next.setHours(9, 0, 0, 0);
    return next;
  }

  if (lowerFreq === "monthly" || lowerFreq === "every month") {
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    next.setHours(9, 0, 0, 0);
    return next;
  }

  const everyMatch = lowerFreq.match(/every\s+(\d+)\s+days?/);
  if (everyMatch) {
    const days = parseInt(everyMatch[1], 10);
    const next = new Date(now);
    next.setDate(next.getDate() + days);
    next.setHours(9, 0, 0, 0);
    return next;
  }

  // Default to daily
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next;
}
