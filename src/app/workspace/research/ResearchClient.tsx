"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "./FileUpload";
import { ResearchOutline } from "./ResearchOutline";

interface ResearchNote {
  id: string;
  title: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ResearchClientProps {
  initialHistory: ResearchNote[];
}

interface Section {
  heading: string;
  key_points: string[];
  sources: string[];
  draft_paragraph?: string;
}

interface ResearchOutlineData {
  thesis: string;
  sections: Section[];
  important_terms: string[];
  draft_intro?: string;
}

export function ResearchClient({ initialHistory }: ResearchClientProps) {
  const [topic, setTopic] = useState("");
  const [pdfText, setPdfText] = useState("");
  const [history, setHistory] = useState<ResearchNote[]>(initialHistory);
  const [isPending, startTransition] = useTransition();
  const [outline, setOutline] = useState<ResearchOutlineData | null>(null);
  const [isDrafting, setIsDrafting] = useState<number | null>(null);

  async function handleResearch() {
    if (!topic.trim() && !pdfText.trim()) {
      toast.error("Please enter a topic or upload a PDF");
      return;
    }

    setOutline(null); // Clear previous outline

    startTransition(async () => {
      try {
        const response = await fetch("/api/research", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: topic.trim() || "Research from PDF",
            pdfText: pdfText || undefined,
          }),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error("Try again");
          return;
        }

        // Set outline result
        if (data.outline) {
          setOutline(data.outline);
        }

        // Refresh history from Supabase
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: newHistory } = await supabase
            .from("notes")
            .select("id, title, summary, metadata, created_at")
            .eq("user_id", user.id)
            .eq("type", "research")
            .order("created_at", { ascending: false })
            .limit(50);

          if (newHistory) {
            setHistory(newHistory);
          }
        }

        setTopic("");
        setPdfText("");
        toast.success("Research outline generated!");
      } catch (err) {
        toast.error("Try again");
      }
    });
  }

  async function handleDraftParagraph(sectionIndex: number) {
    if (!outline || !outline.sections[sectionIndex]) return;

    const section = outline.sections[sectionIndex];
    setIsDrafting(sectionIndex);

    try {
      const response = await fetch("/api/research/draft-paragraph", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          heading: section.heading,
          keyPoints: section.key_points,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error("Failed to generate paragraph");
        return;
      }

      // Update the outline with the new draft paragraph
      if (data.paragraph && outline) {
        const updatedOutline = { ...outline };
        updatedOutline.sections[sectionIndex] = {
          ...section,
          draft_paragraph: data.paragraph,
        };
        setOutline(updatedOutline);
        toast.success("Paragraph generated!");
      }
    } catch (err) {
      toast.error("Failed to generate paragraph");
    } finally {
      setIsDrafting(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Left side: Input area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Research Copilot</h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            Type a topic or upload a PDF to get a structured outline and key points.
          </p>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <Textarea
            placeholder="Describe your research topic or question..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="flex-1 min-h-[200px] sm:min-h-[300px] resize-none"
            disabled={isPending}
          />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <FileUpload
              onTextExtracted={(text) => setPdfText(text)}
              disabled={isPending}
            />
            <Button
              onClick={handleResearch}
              disabled={isPending || (!topic.trim() && !pdfText.trim())}
              className="w-full sm:w-auto"
            >
              {isPending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Outline"
              )}
            </Button>
          </div>

          {/* Show outline result */}
          {!isPending && outline && (
            <ResearchOutline
              outline={outline}
              onDraftParagraph={handleDraftParagraph}
              isDrafting={isDrafting}
            />
          )}
        </div>
      </div>

      {/* Right side: History */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <Card className="h-full flex flex-col min-h-[300px] lg:min-h-0">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Research History</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No research outlines yet. Generate your first outline to see it here.
              </p>
            ) : (
              <ul className="space-y-3">
                {history.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-md border border-border p-3 text-sm space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground line-clamp-2 flex-1 text-xs sm:text-sm">
                        {note.title || "Untitled"}
                      </p>
                      <span className="text-muted-foreground text-xs shrink-0 whitespace-nowrap ml-2">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
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
