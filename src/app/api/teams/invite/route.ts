import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email;
    const teamId = body.team_id;

    if (typeof email !== "string" || email.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty 'email' field in request body" },
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
        { error: "You must be a team member to invite others" },
        { status: 403 }
      );
    }

    // Look up user by email
    const { data: targetUser, error: userLookupError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.trim())
      .single();

    if (userLookupError || !targetUser) {
      return NextResponse.json(
        { error: "User with this email not found" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", targetUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this team" },
        { status: 400 }
      );
    }

    // Add user to team
    const { error: insertError } = await supabase.from("team_members").insert({
      team_id: teamId,
      user_id: targetUser.id,
    });

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to add member: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true },
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
