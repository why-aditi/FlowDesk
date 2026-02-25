"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2Icon } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeetingSummary } from "./MeetingSummary";

interface MeetingNote {
  id: string;
  title: string;
  summary: string;
  metadata: Record<string, unknown>;
  content: string;
  created_at: string;
}

interface MeetingsClientProps {
  initialHistory: MeetingNote[];
}

interface MeetingSummaryData {
  summary: string;
  decisions: string[];
  action_items: Array<{
    task: string;
    owner?: string;
    due?: string | null;
  }>;
  open_questions: string[];
  follow_up_needed?: boolean;
}

export function MeetingsClient({ initialHistory }: MeetingsClientProps) {
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState<MeetingNote[]>(initialHistory);
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<MeetingSummaryData | null>(null);
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null);

  function handleSelectNote(note: MeetingNote) {
    setSelectedNote(note);
    setTitle(note.title);
    setTranscript(note.content);
    // Parse metadata to set summary
    if (note.metadata && typeof note.metadata === "object") {
      const metadata = note.metadata as Record<string, unknown>;
      // The metadata contains the full summary structure
      if (typeof metadata.summary === "string" || Array.isArray(metadata.action_items)) {
        const summaryData: MeetingSummaryData = {
          summary: (metadata.summary as string) || note.summary,
          decisions: Array.isArray(metadata.decisions)
            ? (metadata.decisions as string[])
            : [],
          action_items: Array.isArray(metadata.action_items)
            ? (metadata.action_items as Array<{
                task: string;
                owner?: string;
                due?: string | null;
              }>)
            : [],
          open_questions: Array.isArray(metadata.open_questions)
            ? (metadata.open_questions as string[])
            : [],
          follow_up_needed:
            typeof metadata.follow_up_needed === "boolean"
              ? metadata.follow_up_needed
              : undefined,
        };
        setSummary(summaryData);
      }
    }
  }

  async function handleSummarize() {
    if (!transcript.trim()) {
      toast.error("Please enter a transcript");
      return;
    }

    setSummary(null); // Clear previous summary
    setSelectedNote(null); // Clear selected note

    startTransition(async () => {
      try {
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcript: transcript.trim(),
            title: title.trim() || undefined,
          }),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error("Try again");
          return;
        }

        // Set summary result
        if (data.summary) {
          setSummary(data.summary as MeetingSummaryData);
        }

        // Refresh history from Supabase
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: newHistory } = await supabase
            .from("notes")
            .select("id, title, summary, metadata, content, created_at")
            .eq("user_id", user.id)
            .eq("type", "meetings")
            .order("created_at", { ascending: false })
            .limit(50);

          if (newHistory) {
            setHistory(newHistory);
          }
        }

        setTitle("");
        setTranscript("");
        toast.success("Meeting summarized!");
      } catch (err) {
        toast.error("Try again");
      }
    });
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Left side: Input area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Meeting Summarizer</h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            Paste a meeting or call transcript to get a summary, decisions, and action items.
          </p>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm">Title (optional)</Label>
            <Input
              id="title"
              placeholder="Meeting title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <Label htmlFor="transcript" className="text-sm">Transcript</Label>
            <Textarea
              id="transcript"
              placeholder="Paste meeting transcript here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="flex-1 min-h-[300px] sm:min-h-[400px] resize-none"
              disabled={isPending}
            />
          </div>

          <Button
            onClick={handleSummarize}
            disabled={isPending || !transcript.trim()}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Summarizing...
              </>
            ) : (
              "Summarize"
            )}
          </Button>

          {/* Show summary result */}
          {!isPending && summary && (
            <MeetingSummary summary={summary} />
          )}
        </div>
      </div>

      {/* Right side: History */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <Card className="h-full flex flex-col min-h-[300px] lg:min-h-0">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Meeting History</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No meeting summaries yet. Summarize your first meeting to see it here.
              </p>
            ) : (
              <ul className="space-y-2">
                {history.map((note) => (
                  <li
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`
                      rounded-md border border-border p-3 text-sm cursor-pointer
                      transition-colors hover:bg-accent
                      ${selectedNote?.id === note.id ? "bg-accent border-primary/20" : ""}
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground line-clamp-2 flex-1 text-xs sm:text-sm">
                        {note.title || "Untitled Meeting"}
                      </p>
                      <span className="text-muted-foreground text-xs shrink-0 whitespace-nowrap ml-2">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {note.summary}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
