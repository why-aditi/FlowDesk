import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateJSON } from "@/lib/groq";

interface AskResponse {
  answer: string;
}

const SYSTEM_PROMPT = `You are a team knowledge assistant. Answer questions based on the provided knowledge base entries.

Use the knowledge entries to provide accurate, helpful answers. If the answer isn't in the knowledge base, say so clearly.

Return a JSON object with a single "answer" field containing your response.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = body.question;
    const teamId = body.team_id;

    if (typeof question !== "string" || question.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty 'question' field in request body" },
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

    // Verify user is a member of the team
    const { data: memberCheck } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!memberCheck) {
      return NextResponse.json(
        { error: "You must be a team member to ask questions" },
        { status: 403 }
      );
    }

    // Fetch all knowledge entries for the team
    const { data: entries, error: entriesError } = await supabase
      .from("knowledge_entries")
      .select("question, answer")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (entriesError) {
      return NextResponse.json(
        { error: `Failed to fetch knowledge entries: ${entriesError.message}` },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { error: "No knowledge entries found for this team" },
        { status: 404 }
      );
    }

    // Build context from knowledge entries
    const knowledgeContext = entries
      .map((entry, index) => `Q${index + 1}: ${entry.question}\nA${index + 1}: ${entry.answer}`)
      .join("\n\n");

    const userInput = `Knowledge Base:\n${knowledgeContext}\n\nUser Question: ${question}`;

    // Call Groq to generate answer
    let result: AskResponse;
    try {
      result = await generateJSON<AskResponse>(
        SYSTEM_PROMPT,
        userInput,
        (parsed) => {
          if (typeof parsed !== "object" || parsed === null) {
            throw new Error("Response must be an object");
          }
          const obj = parsed as Record<string, unknown>;
          if (typeof obj.answer !== "string" || obj.answer.trim() === "") {
            throw new Error("Response must have a non-empty 'answer' field");
          }
          return parsed as AskResponse;
        }
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate answer";
      return NextResponse.json(
        { error: `AI processing failed: ${errorMessage}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, answer: result.answer },
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
