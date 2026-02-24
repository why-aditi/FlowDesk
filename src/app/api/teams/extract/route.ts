import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateJSON } from "@/lib/groq";

interface QAPair {
  question: string;
  answer: string;
}

interface ExtractionResponse {
  qa_pairs: QAPair[];
}

const SYSTEM_PROMPT = `You are a knowledge extraction assistant. Analyze the provided note content and extract question-answer pairs that would be useful for a team knowledge base.

Return a JSON object with the following structure:
{
  "qa_pairs": [
    {
      "question": "A clear, specific question",
      "answer": "A concise answer to the question"
    }
  ]
}

Extract 3-10 useful Q&A pairs from the content. Focus on actionable information, key decisions, important facts, and processes. Return valid JSON only.`;

function validateExtractionResponse(parsed: unknown): ExtractionResponse {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Response must be an object");
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.qa_pairs)) {
    throw new Error("Response must have a 'qa_pairs' array");
  }

  for (const pair of obj.qa_pairs) {
    if (typeof pair !== "object" || pair === null) {
      throw new Error("Each Q&A pair must be an object");
    }
    const p = pair as Record<string, unknown>;
    if (typeof p.question !== "string" || p.question.trim() === "") {
      throw new Error("Each Q&A pair must have a non-empty 'question' field");
    }
    if (typeof p.answer !== "string" || p.answer.trim() === "") {
      throw new Error("Each Q&A pair must have a non-empty 'answer' field");
    }
  }

  return parsed as ExtractionResponse;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const noteId = body.note_id;
    const teamId = body.team_id;

    if (typeof noteId !== "string" || noteId.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty 'note_id' field in request body" },
        { status: 400 }
      );
    }

    if (typeof teamId !== "string" || teamId.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty 'team_id' field in request body" },
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

    // Verify user owns the note
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id, content, title")
      .eq("id", noteId)
      .eq("user_id", user.id)
      .single();

    if (noteError || !note) {
      return NextResponse.json(
        { error: "Note not found or access denied" },
        { status: 404 }
      );
    }

    // Verify user is a member of the team
    const { data: memberCheck } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!memberCheck) {
      return NextResponse.json(
        { error: "You must be a team member to add notes" },
        { status: 403 }
      );
    }

    // Extract Q&A pairs using Groq
    let extraction: ExtractionResponse;
    try {
      extraction = await generateJSON<ExtractionResponse>(
        SYSTEM_PROMPT,
        note.content || note.title || "",
        validateExtractionResponse
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to extract Q&A pairs";
      return NextResponse.json(
        { error: `AI processing failed: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Insert each Q&A pair into knowledge_entries
    const entries = extraction.qa_pairs.map((pair) => ({
      team_id: teamId,
      question: pair.question,
      answer: pair.answer,
      source_note_id: noteId,
    }));

    const { error: insertError } = await supabase
      .from("knowledge_entries")
      .insert(entries);

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to save knowledge entries: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, count: extraction.qa_pairs.length },
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
