import { createServerClient } from "@/lib/supabase-server";
import { MeetingsClient } from "./MeetingsClient";

async function getMeetingHistory(userId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, summary, metadata, content, created_at")
    .eq("user_id", userId)
    .eq("type", "meetings")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return [];
  }

  return data ?? [];
}

export default async function MeetingsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const meetingHistory = await getMeetingHistory(user.id);

  return <MeetingsClient initialHistory={meetingHistory} />;
}
