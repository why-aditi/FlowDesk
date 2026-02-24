import { createServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { KnowledgeHubClient } from "./KnowledgeHubClient";

async function getTeamData(slug: string, userId: string) {
  const supabase = await createServerClient();

  // Fetch team
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, slug, created_at")
    .eq("slug", slug)
    .single();

  if (teamError || !team) {
    return null;
  }

  // Verify user is a member
  const { data: memberCheck } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", team.id)
    .eq("user_id", userId)
    .single();

  if (!memberCheck) {
    return null;
  }

  // Fetch team members with user info
  const { data: membersData } = await supabase
    .from("team_members")
    .select("user_id, users!inner(id, email, full_name)")
    .eq("team_id", team.id);

  const members =
    membersData?.map((m) => ({
      id: (m.users as { id: string; email: string; full_name?: string })
        .id,
      email: (m.users as { id: string; email: string; full_name?: string })
        .email,
      full_name: (m.users as {
        id: string;
        email: string;
        full_name?: string;
      }).full_name,
    })) || [];

  // Fetch knowledge entries
  const { data: knowledgeEntries } = await supabase
    .from("knowledge_entries")
    .select(
      "id, question, answer, source_note_id, created_at, notes!left(title)"
    )
    .eq("team_id", team.id)
    .order("created_at", { ascending: false });

  const entries =
    knowledgeEntries?.map((entry) => ({
      id: entry.id,
      question: entry.question,
      answer: entry.answer,
      source_note_id: entry.source_note_id,
      source_note_title: (entry.notes as { title?: string })?.title,
      created_at: entry.created_at,
    })) || [];

  // Fetch user's notes for the picker
  const { data: userNotes } = await supabase
    .from("notes")
    .select("id, title, type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return {
    team,
    members,
    knowledgeEntries: entries,
    userNotes: userNotes || [],
  };
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ team_slug: string }>;
}) {
  const { team_slug } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return notFound();
  }

  const data = await getTeamData(team_slug, user.id);

  if (!data) {
    return notFound();
  }

  return (
    <KnowledgeHubClient
      team={data.team}
      members={data.members}
      initialEntries={data.knowledgeEntries}
      userNotes={data.userNotes}
    />
  );
}
