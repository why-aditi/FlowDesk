import { createServerClient } from "@/lib/supabase-server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardClient } from "./DashboardClient";
import { PlannerProgressMobile } from "./PlannerProgressMobile";

function getFirstName(fullName: string | undefined, email: string): string {
  if (fullName?.trim()) {
    const first = fullName.trim().split(/\s+/)[0];
    if (first) return first;
  }
  const at = email.indexOf("@");
  if (at > 0) return email.slice(0, at);
  return "there";
}

async function getDashboardData(userId: string) {
  const supabase = await createServerClient();

  const [notesCountRes, tasksCountRes, teamsCountRes, recentNotesRes, tasksRes] =
    await Promise.all([
      supabase
        .from("notes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .neq("status", "done"),
      supabase
        .from("team_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("notes")
        .select("id, title, type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const notesCount = notesCountRes.error ? 0 : (notesCountRes.count ?? 0);
  const tasksCount = tasksCountRes.error ? 0 : (tasksCountRes.count ?? 0);
  const teamsCount = teamsCountRes.error ? 0 : (teamsCountRes.count ?? 0);
  const recentNotes = recentNotesRes.error ? [] : recentNotesRes.data ?? [];
  const tasks = tasksRes.error ? [] : (tasksRes.data ?? []);

  return { notesCount, tasksCount, teamsCount, recentNotes, tasks };
}

export default async function WorkspacePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const fullName = (user.user_metadata?.full_name as string) ?? "";
  const email = user.email ?? "";
  const firstName = getFirstName(fullName, email);

  const { notesCount, tasksCount, teamsCount, recentNotes, tasks } =
    await getDashboardData(user.id);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            Welcome, {firstName}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Here's what's happening in your workspace.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-2 sm:gap-4 grid-cols-3">
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6">
            <CardDescription className="text-xs sm:text-sm truncate">Notes saved</CardDescription>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl">{notesCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6">
            <CardDescription className="text-xs sm:text-sm truncate">Tasks active</CardDescription>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl">{tasksCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6">
            <CardDescription className="text-xs sm:text-sm truncate">Teams joined</CardDescription>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl">{teamsCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Mobile Planner Progress - shown only on mobile, right after stats */}
      <PlannerProgressMobile />

      <DashboardClient initialTasks={tasks} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Recent notes</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Your 5 most recent notes across inbox, research, and meetings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No notes yet. Use Smart Inbox, Research, or Meeting Summarizer to
              create your first note.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentNotes.map((note) => (
                <li
                  key={note.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium truncate">
                    {note.title || "Untitled"}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">{note.type}</Badge>
                    <span className="text-muted-foreground text-xs">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
