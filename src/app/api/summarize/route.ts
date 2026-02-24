import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateJSON } from "@/lib/groq";

interface ActionItem {
  task: string;
  owner?: string;
  due?: string | null;
}

interface MeetingSummary {
  summary: string;
  decisions: string[];
  action_items: ActionItem[];
  open_questions: string[];
  follow_up_needed?: boolean;
}

const SYSTEM_PROMPT = `You are a meeting assistant that creates structured summaries from transcripts.
Analyze the meeting transcript and return a JSON object with the following structure:
{
  "summary": "A comprehensive summary paragraph of the meeting (required)",
  "decisions": ["Decision 1", "Decision 2", ...],
  "action_items": [
    {
      "task": "Task description (required)",
      "owner": "Person responsible (optional)",
      "due": "ISO 8601 date string or null (optional)"
    }
  ],
  "open_questions": ["Question 1", "Question 2", ...],
  "follow_up_needed": true or false - whether follow-up is needed
}

The summary and action_items fields are required. Return valid JSON only.`;

function validateMeetingSummary(parsed: unknown): MeetingSummary {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Response must be an object");
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.summary !== "string" || obj.summary.trim() === "") {
    throw new Error("Response must have a non-empty 'summary' field");
  }

  if (!Array.isArray(obj.action_items)) {
    throw new Error("Response must have an 'action_items' array");
  }

  return parsed as MeetingSummary;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transcript = body.transcript;
    const title = body.title;

    if (typeof transcript !== "string" || transcript.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty 'transcript' field in request body" },
        { status: 400 }
      );
    }

    // Call Groq to summarize the meeting
    let summary: MeetingSummary;
    try {
      summary = await generateJSON<MeetingSummary>(
        SYSTEM_PROMPT,
        transcript,
        validateMeetingSummary
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to summarize meeting";
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

    // Save to notes table
    const { error: insertError } = await supabase.from("notes").insert({
      user_id: user.id,
      type: "meetings",
      content: transcript, // Original transcript
      summary: summary.summary,
      metadata: summary,
      title: title?.trim() || "Meeting Summary",
    });

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to save note: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, summary },
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
