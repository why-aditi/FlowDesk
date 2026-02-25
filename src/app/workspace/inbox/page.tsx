import { createServerClient } from "@/lib/supabase-server";
import { InboxClient } from "./InboxClient";

async function getInboxHistory(userId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, summary, metadata, created_at")
    .eq("user_id", userId)
    .eq("type", "inbox")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return [];
  }

  return data ?? [];
}

export default async function InboxPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const inboxHistory = await getInboxHistory(user.id);

  return <InboxClient initialHistory={inboxHistory} />;
}
