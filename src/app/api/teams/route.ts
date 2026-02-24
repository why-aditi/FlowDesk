import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body.name;

    if (typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty 'name' field in request body" },
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

    // Generate slug from name
    const slug = generateSlug(name);

    // Check if slug already exists
    const { data: existingTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingTeam) {
      return NextResponse.json(
        { error: "A team with this name already exists" },
        { status: 400 }
      );
    }

    // Create team
    const { data: team, error: insertError } = await supabase
      .from("teams")
      .insert({
        name: name.trim(),
        slug,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create team: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Add creator as team member
    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: user.id,
    });

    if (memberError) {
      return NextResponse.json(
        { error: `Failed to add creator as member: ${memberError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, team },
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
