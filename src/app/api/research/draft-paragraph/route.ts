import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateJSON } from "@/lib/groq";

interface DraftParagraphResponse {
  paragraph: string;
}

const SYSTEM_PROMPT = `You are a research assistant that writes draft paragraphs for research sections.
Given a section heading and key points, write a well-structured paragraph (3-5 sentences) that:
- Introduces the section topic
- Incorporates the key points naturally
- Flows smoothly and is ready for use in a research paper

Return a JSON object with a single "paragraph" field containing the draft paragraph text.`;

function validateDraftParagraph(parsed: unknown): DraftParagraphResponse {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Response must be an object");
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.paragraph !== "string" || obj.paragraph.trim() === "") {
    throw new Error("Response must have a non-empty 'paragraph' field");
  }

  return parsed as DraftParagraphResponse;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const heading = body.heading;
    const keyPoints = body.keyPoints;

    if (typeof heading !== "string" || heading.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty 'heading' field in request body" },
        { status: 400 }
      );
    }

    if (!Array.isArray(keyPoints) || keyPoints.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty 'keyPoints' array in request body" },
        { status: 400 }
      );
    }

    // Authenticate — before consuming AI quota
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

    // Build the input
    const userInput = `Section Heading: ${heading}\n\nKey Points:\n${keyPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}\n\nWrite a draft paragraph for this section.`;

    // Call Groq to generate draft paragraph
    let result: DraftParagraphResponse;
    try {
      result = await generateJSON<DraftParagraphResponse>(
        SYSTEM_PROMPT,
        userInput,
        validateDraftParagraph
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate paragraph";
      return NextResponse.json(
        { error: `AI processing failed: ${errorMessage}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, paragraph: result.paragraph },
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
