import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateJSON } from "@/lib/groq";

interface AutomationRule {
  frequency: string; // e.g., "daily", "weekly", "monthly", "every 3 days"
  description: string; // Plain English description of the automation
  email_subject?: string;
  email_body?: string;
}

const SYSTEM_PROMPT = `You are a task automation assistant. Analyze the user's description of a repetitive process and return a JSON object with automation rules:
{
  "frequency": "How often the task should run (e.g., 'daily', 'weekly', 'monthly', 'every 3 days', 'every Monday', 'first day of month')",
  "description": "A plain English description of what this automation does (required)",
  "email_subject": "Optional email subject if this automation sends emails",
  "email_body": "Optional email body if this automation sends emails"
}

The frequency and description fields are required. Return valid JSON only.`;

function validateAutomationRule(parsed: unknown): AutomationRule {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Response must be an object");
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.frequency !== "string" || obj.frequency.trim() === "") {
    throw new Error("Response must have a non-empty 'frequency' field");
  }

  if (typeof obj.description !== "string" || obj.description.trim() === "") {
    throw new Error("Response must have a non-empty 'description' field");
  }

  return parsed as AutomationRule;
}

function calculateNextRun(frequency: string): Date {
  const now = new Date();
  const lowerFreq = frequency.toLowerCase().trim();

  if (lowerFreq === "daily" || lowerFreq === "every day") {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0); // 9 AM
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

  // Try to parse "every N days"
  const everyMatch = lowerFreq.match(/every\s+(\d+)\s+days?/);
  if (everyMatch) {
    const days = parseInt(everyMatch[1], 10);
    const next = new Date(now);
    next.setDate(next.getDate() + days);
    next.setHours(9, 0, 0, 0);
    return next;
  }

  // Default to daily if can't parse
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const description = body.description;

    if (typeof description !== "string" || description.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty 'description' field in request body" },
        { status: 400 }
      );
    }

    // Call Groq to parse automation
    let automation: AutomationRule;
    try {
      automation = await generateJSON<AutomationRule>(
        SYSTEM_PROMPT,
        description,
        validateAutomationRule
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to parse automation";
      return NextResponse.json(
        { error: `AI processing failed: ${errorMessage}` },
        { status: 500 }
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

    // Calculate next_run timestamp
    const nextRun = calculateNextRun(automation.frequency);

    // Create task with automation
    const { error: insertError } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: automation.description,
      status: "todo",
      automation: automation,
      next_run: nextRun.toISOString(),
    });

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create task: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, automation },
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
