"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TriageCard } from "./TriageCard";
import { AILoadingState } from "./AILoadingState";
import { AddToTaskDialog } from "@/components/AddToTaskDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InboxNote {
  id: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface InboxClientProps {
  initialHistory: InboxNote[];
}

export function InboxClient({ initialHistory }: InboxClientProps) {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<InboxNote[]>(initialHistory);
  const [isPending, startTransition] = useTransition();
  const [triageResult, setTriageResult] = useState<{
    summary: string;
    category?: string;
    priority?: "high" | "medium" | "low";
    sender?: string;
    subject?: string;
    action_required?: boolean;
    deadline?: string | null;
    actionItems?: string[];
  } | null>(null);
  const [selectedNote, setSelectedNote] = useState<InboxNote | null>(null);
  const [showAddToTaskDialog, setShowAddToTaskDialog] = useState(false);

  async function handleTriage() {
    if (!message.trim()) {
      toast.error("Please enter a message to triage");
      return;
    }

    setTriageResult(null); // Clear previous result

    startTransition(async () => {
      try {
        const response = await fetch("/api/triage-inbox", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
          credentials: "include",
        });

        if (!response.ok) {
          let errorMessage = `Request failed (${response.status})`;
          try {
            const errData = await response.json();
            if (errData?.error) errorMessage = `${errorMessage}: ${errData.error}`;
          } catch {
            try {
              const text = await response.text();
              if (text) errorMessage = `${errorMessage}: ${text}`;
            } catch { /* ignore */ }
          }
          toast.error(errorMessage);
          return;
        }

        const data = await response.json();

        // Set triage result to display in TriageCard
        if (data.triage) {
          setTriageResult(data.triage);
          // Show dialog to add to tasks
          setShowAddToTaskDialog(true);
        }

        // Refresh history from Supabase
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: newHistory } = await supabase
            .from("notes")
            .select("id, summary, metadata, created_at")
            .eq("user_id", user.id)
            .eq("type", "inbox")
            .order("created_at", { ascending: false })
            .limit(50);

          if (newHistory) {
            setHistory(newHistory);
          }
        }

        setMessage("");
        toast.success("Triaged!");
      } catch (err) {
        console.error("[InboxClient] handleTriage error", err);
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to triage: ${message}`);
      }
    });
  }

  // Safely cast a history note's metadata to the triage shape
  function noteToTriage(note: InboxNote) {
    const m = note.metadata ?? {};
    return {
      summary: note.summary,
      category: typeof m.category === "string" ? m.category : undefined,
      priority: (["high", "medium", "low"] as const).includes(m.priority as "high" | "medium" | "low")
        ? (m.priority as "high" | "medium" | "low")
        : undefined,
      sender: typeof m.sender === "string" ? m.sender : undefined,
      subject: typeof m.subject === "string" ? m.subject : undefined,
      action_required: typeof m.action_required === "boolean" ? m.action_required : undefined,
      deadline: typeof m.deadline === "string" ? m.deadline : null,
      actionItems: Array.isArray(m.actionItems)
        ? (m.actionItems as unknown[]).filter((i): i is string => typeof i === "string")
        : undefined,
    };
  }

  return (
    <>
      <div className="p-4 sm:p-6 h-full flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Left side: Input area */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Smart Inbox</h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Paste any email, message, or notification to triage with AI.
            </p>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <Textarea
              placeholder="Paste any email, message or notification here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 min-h-[200px] sm:min-h-[300px] resize-none"
              disabled={isPending}
            />

            <Button
              onClick={handleTriage}
              disabled={isPending || !message.trim()}
              className="w-full sm:w-auto"
            >
              {isPending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Triaging...
                </>
              ) : (
                "Triage"
              )}
            </Button>

            {/* Show loading state while triaging */}
            {isPending && <AILoadingState />}

            {/* Show triage result after successful triage */}
            {!isPending && triageResult && (
              <TriageCard triage={triageResult} />
            )}
          </div>
        </div>

        {/* Right side: History */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <Card className="h-full flex flex-col min-h-[300px] lg:min-h-0">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Inbox History</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No triaged notes yet. Triage your first message to see it here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {history.map((note) => {
                    const category = note.metadata?.category;
                    const categoryString = typeof category === "string" ? category : null;

                    return (
                      <li
                        key={note.id}
                        onClick={() => setSelectedNote(note)}
                        className="rounded-md border border-border p-3 text-sm space-y-2 cursor-pointer transition-colors hover:bg-muted/60 hover:border-muted-foreground/30 active:bg-muted"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedNote(note);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-foreground line-clamp-3 flex-1 text-xs sm:text-sm">
                            {note.summary}
                          </p>
                          <span className="text-muted-foreground text-xs shrink-0 whitespace-nowrap ml-2">
                            {new Date(note.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {categoryString && (
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              {categoryString}
                            </Badge>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog
        open={!!selectedNote}
        onOpenChange={(open) => {
          if (!open) setSelectedNote(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedNote?.summary.slice(0, 60) || "Inbox Note"}
            </DialogTitle>
            {selectedNote && (
              <p className="text-xs text-muted-foreground">
                {new Date(selectedNote.created_at).toLocaleString()}
              </p>
            )}
          </DialogHeader>
          {selectedNote && (
            <TriageCard triage={noteToTriage(selectedNote)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Add to Task Dialog */}
      {triageResult && (
        <AddToTaskDialog
          open={showAddToTaskDialog}
          onOpenChange={setShowAddToTaskDialog}
          defaultTitle={triageResult.summary}
        />
      )}
    </>
  );
}
