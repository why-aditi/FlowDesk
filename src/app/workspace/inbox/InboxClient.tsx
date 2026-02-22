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

        const data = await response.json();

        if (!response.ok) {
          toast.error("Try again");
          return;
        }

        // Set triage result to display in TriageCard
        if (data.triage) {
          // Defensively normalize actionItems before setting triage result
          const triage = { ...data.triage };
          
          if (triage.actionItems !== undefined) {
            if (!Array.isArray(triage.actionItems)) {
              // If it's a string, try splitting on commas
              if (typeof triage.actionItems === "string") {
                triage.actionItems = triage.actionItems
                  .split(",")
                  .map((item: string) => item.trim())
                  .filter((item: string) => item !== "");
              } else if (triage.actionItems !== null && triage.actionItems !== undefined) {
                // If it's a single non-array value, wrap it in an array
                triage.actionItems = [String(triage.actionItems)];
              } else {
                // Otherwise, replace with empty array
                triage.actionItems = [];
              }
            }
          }
          
          setTriageResult(triage);
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
        toast.error("Try again");
      }
    });
  }

  return (
    <div className="p-6 h-full flex gap-6">
      {/* Left side: Input area */}
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Smart Inbox</h1>
          <p className="mt-2 text-muted-foreground">
            Paste any email, message, or notification to triage with AI.
          </p>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <Textarea
            placeholder="Paste any email, message or notification here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 min-h-[300px]"
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
      <div className="w-80 flex-shrink-0">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Inbox History</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No triaged notes yet. Triage your first message to see it here.
              </p>
            ) : (
              <ul className="space-y-3">
                {history.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-md border border-border p-3 text-sm space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-foreground line-clamp-3 flex-1">
                        {note.summary}
                      </p>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {note.metadata?.category && typeof note.metadata.category === "string" ? (
                      <div>
                        <Badge variant="secondary" className="text-xs">
                          {note.metadata.category as string}
                        </Badge>
                      </div>
                    ) : null}
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
