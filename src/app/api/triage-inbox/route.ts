import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateJSON } from "@/lib/groq";

interface TriageResponse {
  summary: string;
  category?: string;
  priority?: "high" | "medium" | "low";
  actionItems?: string[];
  sender?: string;
  subject?: string;
  action_required?: boolean;
  deadline?: string | null;
  [key: string]: unknown;
}

const SYSTEM_PROMPT = `You are an AI assistant that helps triage emails, messages, and notifications. 
Analyze the content and return a JSON object with the following structure:
{
  "summary": "A concise summary of the message (required)",
  "category": "Optional category (e.g., 'email', 'notification', 'task', 'meeting')",
  "priority": "Priority level - must be one of: 'high', 'medium', or 'low'",
  "sender": "Email sender or message author if extractable",
  "subject": "Email subject line or message title if extractable",
  "action_required": true or false - whether the message requires action from the recipient,
  "deadline": "ISO 8601 date string if a deadline is mentioned, otherwise null",
  "actionItems": ["Optional array of action items extracted from the message"]
}

The summary field is required. Priority should be 'high', 'medium', or 'low'. Return valid JSON only.`;

function validateTriageResponse(parsed: unknown): TriageResponse {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Response must be an object");
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.summary !== "string" || obj.summary.trim() === "") {
    throw new Error("Response must have a non-empty 'summary' field");
  }

  return parsed as TriageResponse;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body.message;

    if (typeof message !== "string" || message.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty 'message' field in request body" },
        { status: 400 }
      );
    }

    // Authenticate first — before consuming AI quota
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

    // Call Groq to triage the message
    let triageResult: TriageResponse;
    try {
      triageResult = await generateJSON<TriageResponse>(
        SYSTEM_PROMPT,
        message,
        validateTriageResponse
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to triage message";
      return NextResponse.json(
        { error: `AI processing failed: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Save to notes table
    const { error: insertError } = await supabase.from("notes").insert({
      user_id: user.id,
      type: "inbox",
      content: message, // Original message content
      summary: triageResult.summary,
      metadata: triageResult,
      title: triageResult.summary.slice(0, 100), // Use summary as title, truncated
    });

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to save note: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, triage: triageResult },
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
