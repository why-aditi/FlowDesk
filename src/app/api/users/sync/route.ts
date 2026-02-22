import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST() {
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

  const { id, email } = user;
  const full_name =
    (user.user_metadata?.full_name as string) ?? "";

  const { error: upsertError } = await supabase.from("users").upsert(
    {
      id,
      email: email ?? "",
      full_name,
      plan: "free",
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    return NextResponse.json(
      { error: upsertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
