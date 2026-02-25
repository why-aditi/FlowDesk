"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2Icon } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";

interface Section {
  heading: string;
  key_points: string[];
  sources: string[];
  draft_paragraph?: string;
}

interface ResearchOutlineProps {
  outline: {
    thesis: string;
    sections: Section[];
    important_terms: string[];
    draft_intro?: string;
  };
  onDraftParagraph: (sectionIndex: number) => Promise<void>;
  isDrafting: number | null;
}

export function ResearchOutline({
  outline,
  onDraftParagraph,
  isDrafting,
}: ResearchOutlineProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set()
  );
  const [introExpanded, setIntroExpanded] = useState(false);

  function toggleSection(index: number) {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  }

  return (
    <div className="space-y-6">
      {/* Thesis Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-foreground">
              {outline.thesis}
            </CardTitle>
          </div>
          <CopyButton text={outline.thesis} />
        </CardHeader>
      </Card>

      {/* Draft Intro Paragraph */}
      {outline.draft_intro && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Draft Introduction</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIntroExpanded(!introExpanded)}
              >
                {introExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {introExpanded && (
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {outline.draft_intro}
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {outline.sections.map((section, index) => {
          const isExpanded = expandedSections.has(index);
          const hasDraft = !!section.draft_paragraph;

          return (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle
                    className="text-base cursor-pointer flex-1"
                    onClick={() => toggleSection(index)}
                  >
                    {section.heading}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection(index)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4">
                  {/* Key Points */}
                  {section.key_points && section.key_points.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">
                        Key Points:
                      </h4>
                      <ul className="space-y-1">
                        {section.key_points.map((point, pointIndex) => (
                          <li
                            key={pointIndex}
                            className="text-sm text-foreground flex items-start gap-2"
                          >
                            <span className="text-muted-foreground mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sources */}
                  {section.sources && section.sources.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">
                        Sources:
                      </h4>
                      <ul className="space-y-1">
                        {section.sources.map((source, sourceIndex) => (
                          <li
                            key={sourceIndex}
                            className="text-sm text-muted-foreground"
                          >
                            {source}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Draft Paragraph */}
                  {hasDraft && (
                    <div className="rounded-md border border-border bg-muted/30 p-3">
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {section.draft_paragraph}
                      </p>
                    </div>
                  )}

                  {/* Draft Paragraph Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDraftParagraph(index)}
                    disabled={isDrafting === index}
                    className="w-full sm:w-auto"
                  >
                    {isDrafting === index ? (
                      <>
                        <Loader2Icon className="animate-spin" />
                        Drafting...
                      </>
                    ) : (
                      "Draft Paragraph"
                    )}
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Important Terms */}
      {outline.important_terms && outline.important_terms.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">
            Important Terms:
          </h3>
          <div className="flex flex-wrap gap-2">
            {outline.important_terms.map((term, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {term}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
