"use client";

import { useState, useEffect, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2Icon } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Team {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  knowledge_count?: number;
}

export function TeamsClient() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isInviting, setIsInviting] = useState<string | null>(null);

  // Create team form state
  const [teamName, setTeamName] = useState("");

  // Invite form state (per team)
  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>({});

  // Fetch teams on mount
  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch teams where user is a member
      const { data: memberData } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id);

      if (!memberData || memberData.length === 0) {
        setTeams([]);
        setIsLoading(false);
        return;
      }

      const teamIds = memberData.map((m) => m.team_id);

      // Fetch teams with counts
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, slug, created_at, updated_at")
        .in("id", teamIds)
        .order("updated_at", { ascending: false });

      if (teamsError) {
        throw teamsError;
      }

      // Fetch member counts and knowledge counts for each team
      const teamsWithCounts = await Promise.all(
        (teamsData || []).map(async (team) => {
          const [memberRes, knowledgeRes] = await Promise.all([
            supabase
              .from("team_members")
              .select("id", { count: "exact", head: true })
              .eq("team_id", team.id),
            supabase
              .from("knowledge_entries")
              .select("id", { count: "exact", head: true })
              .eq("team_id", team.id),
          ]);

          return {
            ...team,
            member_count: memberRes.count ?? 0,
            knowledge_count: knowledgeRes.count ?? 0,
          };
        })
      );

      setTeams(teamsWithCounts);
    } catch (err) {
      toast.error("Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTeam() {
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/teams", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: teamName }),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Try again");
          return;
        }

        setTeamName("");
        await fetchTeams();
        toast.success("Team created!");
      } catch (err) {
        toast.error("Try again");
      }
    });
  }

  async function handleInvite(teamId: string) {
    const email = inviteEmails[teamId]?.trim();
    if (!email) {
      toast.error("Please enter an email");
      return;
    }

    setIsInviting(teamId);
    try {
      const response = await fetch("/api/teams/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          team_id: teamId,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Try again");
        return;
      }

      setInviteEmails((prev) => ({ ...prev, [teamId]: "" }));
      await fetchTeams();
      toast.success("Member invited!");
    } catch (err) {
      toast.error("Try again");
    } finally {
      setIsInviting(null);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Teams</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Create a team and share notes to build a searchable knowledge hub.
        </p>
      </div>

      {/* Create Team Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Create Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name" className="text-sm">Team Name</Label>
            <Input
              id="team-name"
              placeholder="Enter team name..."
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Slug will be auto-generated from the name
            </p>
          </div>
          <Button
            onClick={handleCreateTeam}
            disabled={isPending || !teamName.trim()}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Creating...
              </>
            ) : (
              "Create Team"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Teams List */}
      <div className="space-y-4">
        <h2 className="text-base sm:text-lg font-semibold">Your Teams</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No teams yet. Create your first team above.
          </p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex-1">
                      <Link
                        href={`/workspace/teams/${team.slug}`}
                        className="hover:underline"
                      >
                        {team.name}
                      </Link>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <span>{team.member_count ?? 0} members</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{team.knowledge_count ?? 0} knowledge entries</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(team.updated_at).toLocaleDateString()}
                  </p>

                  {/* Invite Member */}
                  <div className="space-y-2">
                    <Label htmlFor={`invite-${team.id}`} className="text-xs">
                      Invite by email
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id={`invite-${team.id}`}
                        type="email"
                        placeholder="email@example.com"
                        value={inviteEmails[team.id] || ""}
                        onChange={(e) =>
                          setInviteEmails((prev) => ({
                            ...prev,
                            [team.id]: e.target.value,
                          }))
                        }
                        disabled={isInviting === team.id}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleInvite(team.id)}
                        disabled={isInviting === team.id}
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        {isInviting === team.id ? (
                          <Loader2Icon className="animate-spin" />
                        ) : (
                          "Invite"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
