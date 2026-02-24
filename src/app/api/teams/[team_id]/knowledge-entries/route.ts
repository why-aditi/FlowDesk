import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ team_id: string }> }
) {
  try {
    const { team_id } = await params;

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
      .eq("team_id", team_id)
      .eq("user_id", user.id)
      .single();

    if (!memberCheck) {
      return NextResponse.json(
        { error: "You must be a team member to view knowledge entries" },
        { status: 403 }
      );
    }

    // Fetch knowledge entries
    const { data: knowledgeEntries, error: entriesError } = await supabase
      .from("knowledge_entries")
      .select(
        "id, question, answer, source_note_id, created_at, notes!left(title)"
      )
      .eq("team_id", team_id)
      .order("created_at", { ascending: false });

    if (entriesError) {
      return NextResponse.json(
        { error: `Failed to fetch entries: ${entriesError.message}` },
        { status: 500 }
      );
    }

    const entries =
      knowledgeEntries?.map((entry) => ({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
        source_note_id: entry.source_note_id,
        source_note_title: (entry.notes as { title?: string })?.title,
        created_at: entry.created_at,
      })) || [];

    return NextResponse.json(
      { ok: true, entries },
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
