import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";

/**
 * Auto-confirms a user's email address using admin privileges.
 * This bypasses the email confirmation requirement.
 * Can work with either a session or an email/userId in the request body.
 */
export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;

    // Try to get user from session first
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
    } else {
      // If no session, try to get email or userId from request body
      try {
        const body = await req.json();
        if (body.userId) {
          userId = body.userId;
        } else if (body.email) {
          // Find user by email using admin client
          const adminClient = createAdminClient();
          const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
          
          if (listError) {
            return NextResponse.json(
              { error: "Failed to find user" },
              { status: 500 }
            );
          }

          const foundUser = users.users.find((u) => u.email === body.email);
          if (!foundUser) {
            return NextResponse.json(
              { error: "User not found" },
              { status: 404 }
            );
          }
          userId = foundUser.id;
        }
      } catch {
        // If body parsing fails, continue with userId = null
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User not found or unauthorized" },
        { status: 401 }
      );
    }

    // Use admin client to update user's email confirmation status
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error("Failed to auto-confirm user:", updateError);
      return NextResponse.json(
        { error: "Failed to confirm email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Auto-confirm error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
