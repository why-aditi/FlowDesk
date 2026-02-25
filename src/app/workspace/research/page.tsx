import { createServerClient } from "@/lib/supabase-server";
import { ResearchClient } from "./ResearchClient";

async function getResearchHistory(userId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, summary, metadata, created_at")
    .eq("user_id", userId)
    .eq("type", "research")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return [];
  }

  return data ?? [];
}

export default async function ResearchPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const researchHistory = await getResearchHistory(user.id);

  return <ResearchClient initialHistory={researchHistory} />;
}
