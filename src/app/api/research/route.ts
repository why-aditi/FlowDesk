import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateJSON } from "@/lib/groq";

interface Section {
  heading: string;
  key_points: string[];
  sources: string[];
}

interface ResearchOutline {
  thesis: string;
  sections: Section[];
  important_terms: string[];
  draft_intro?: string;
}

const SYSTEM_PROMPT = `You are a research assistant that creates structured research outlines.
Analyze the research topic or content and return a JSON object with the following structure:
{
  "thesis": "A clear, concise thesis statement (required)",
  "sections": [
    {
      "heading": "Section title",
      "key_points": ["Point 1", "Point 2", ...],
      "sources": ["Source 1", "Source 2", ...]
    }
  ],
  "important_terms": ["term1", "term2", ...],
  "draft_intro": "Optional draft introduction paragraph"
}

The thesis and sections fields are required. Return valid JSON only.`;

function validateResearchOutline(parsed: unknown): ResearchOutline {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Response must be an object");
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.thesis !== "string" || obj.thesis.trim() === "") {
    throw new Error("Response must have a non-empty 'thesis' field");
  }

  if (!Array.isArray(obj.sections)) {
    throw new Error("Response must have a 'sections' array");
  }

  return parsed as ResearchOutline;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic = body.topic;
    const pdfText = body.pdfText;

    if (typeof topic !== "string" || topic.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty 'topic' field in request body" },
        { status: 400 }
      );
    }

    // Build the input - combine topic and PDF text if provided
    const userInput = pdfText
      ? `Research Topic: ${topic}\n\nPDF Content:\n${pdfText}`
      : `Research Topic: ${topic}`;

    // Call Groq to generate research outline
    let outline: ResearchOutline;
    try {
      outline = await generateJSON<ResearchOutline>(
        SYSTEM_PROMPT,
        userInput,
        validateResearchOutline
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate outline";
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
      type: "research",
      content: pdfText || topic, // Original content
      summary: outline.thesis,
      metadata: outline,
      title: topic.slice(0, 100), // Use topic as title, truncated
    });

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to save note: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, outline },
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
