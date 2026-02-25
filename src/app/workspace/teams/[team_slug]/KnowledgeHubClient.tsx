"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { KnowledgeCard } from "../KnowledgeCard";

interface Team {
  id: string;
  name: string;
  slug: string;
}

interface Member {
  id: string;
  email: string;
  full_name?: string;
}

interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  source_note_id?: string;
  source_note_title?: string;
  created_at: string;
}

interface UserNote {
  id: string;
  title: string;
  type: string;
  created_at: string;
}

interface KnowledgeHubClientProps {
  team: Team;
  members: Member[];
  initialEntries: KnowledgeEntry[];
  userNotes: UserNote[];
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0]?.toUpperCase() || "";
  }
  if (email) {
    return email[0]?.toUpperCase() || "";
  }
  return "?";
}

export function KnowledgeHubClient({
  team,
  members,
  initialEntries,
  userNotes,
}: KnowledgeHubClientProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(initialEntries);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isExtracting, startExtraction] = useTransition();
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  async function handleAsk() {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    setIsAsking(true);
    setAnswer(null);

    try {
      const response = await fetch("/api/teams/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          team_id: team.id,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Try again");
        return;
      }

      setAnswer(data.answer);
      setQuestion("");
    } catch (err) {
      toast.error("Try again");
    } finally {
      setIsAsking(false);
    }
  }

  async function handleExtract() {
    if (!selectedNoteId) {
      toast.error("Please select a note");
      return;
    }

    startExtraction(async () => {
      try {
        const response = await fetch("/api/teams/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            note_id: selectedNoteId,
            team_id: team.id,
          }),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Try again");
          return;
        }

        // Refresh entries
        const entriesRes = await fetch(
          `/api/teams/${team.id}/knowledge-entries`,
          { credentials: "include" }
        );
        if (entriesRes.ok) {
          const entriesData = await entriesRes.json();
          if (entriesData.ok && entriesData.entries) {
            setEntries(entriesData.entries);
          }
        }

        setIsDialogOpen(false);
        setSelectedNoteId("");
        toast.success(`Extracted ${data.count} Q&A pairs!`);
      } catch (err) {
        toast.error("Try again");
      }
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Team Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{team.name}</h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <AvatarGroup>
                {members.slice(0, 5).map((member) => (
                  <Avatar key={member.id} size="sm">
                    <AvatarFallback>
                      {getInitials(member.full_name, member.email)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
              <span>{members.length} members</span>
            </div>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Note to Hub</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select a Note</DialogTitle>
              <DialogDescription>
                Choose a note to extract Q&A pairs from
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {userNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No notes available. Create notes in Inbox, Research, or
                  Meetings first.
                </p>
              ) : (
                <>
                  <Select
                    value={selectedNoteId}
                    onValueChange={setSelectedNoteId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a note..." />
                    </SelectTrigger>
                    <SelectContent>
                      {userNotes.map((note) => (
                        <SelectItem key={note.id} value={note.id}>
                          {note.title || "Untitled"} ({note.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleExtract}
                    disabled={isExtracting || !selectedNoteId}
                    className="w-full"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2Icon className="animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      "Extract Q&A Pairs"
                    )}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Q&A Search */}
      <Card>
        <CardHeader>
          <CardTitle>Ask a Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search the knowledge hub..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isAsking) {
                  handleAsk();
                }
              }}
              disabled={isAsking}
              className="flex-1"
            />
            <Button
              onClick={handleAsk}
              disabled={isAsking || !question.trim()}
            >
              {isAsking ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Asking...
                </>
              ) : (
                "Ask"
              )}
            </Button>
          </div>

          {/* AI Answer */}
          {answer && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base">Answer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {answer}
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Entries List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Knowledge Base</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No knowledge entries yet. Add a note to extract Q&A pairs.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {entries.map((entry) => (
              <KnowledgeCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
