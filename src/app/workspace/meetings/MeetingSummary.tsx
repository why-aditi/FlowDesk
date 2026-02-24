"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Check } from "lucide-react";
import { CopyButton } from "../research/CopyButton";
import { toast } from "sonner";

interface ActionItem {
  task: string;
  owner?: string;
  due?: string | null;
}

interface MeetingSummaryProps {
  summary: {
    summary: string;
    decisions: string[];
    action_items: ActionItem[];
    open_questions: string[];
    follow_up_needed?: boolean;
  };
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "—";
  }
}

export function MeetingSummary({ summary }: MeetingSummaryProps) {
  const [addedTasks, setAddedTasks] = useState<Set<number>>(new Set());

  async function handleAddToTasks(actionItem: ActionItem, index: number) {
    if (addedTasks.has(index)) {
      return; // Already added
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: actionItem.task,
          owner: actionItem.owner,
          due: actionItem.due,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error("Failed to add task");
        return;
      }

      setAddedTasks((prev) => new Set(prev).add(index));
      toast.success("Task added!");
    } catch (err) {
      toast.error("Failed to add task");
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Paragraph */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <CardTitle className="text-lg">Summary</CardTitle>
          <CopyButton text={summary.summary} />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {summary.summary}
          </p>
        </CardContent>
      </Card>

      {/* Follow-up Needed Banner */}
      {summary.follow_up_needed && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="size-4 shrink-0" />
          <span className="font-medium">Follow-up needed</span>
        </div>
      )}

      {/* Decisions */}
      {summary.decisions && summary.decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.decisions.map((decision, index) => (
                <li
                  key={index}
                  className="text-sm text-foreground flex items-start gap-2"
                >
                  <span className="text-muted-foreground mt-1">•</span>
                  <span>{decision}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Items Table */}
      {summary.action_items && summary.action_items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.action_items.map((item, index) => {
                  const isAdded = addedTasks.has(index);
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {item.task}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.owner || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(item.due)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant={isAdded ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleAddToTasks(item, index)}
                          disabled={isAdded}
                          className="w-full"
                        >
                          {isAdded ? (
                            <>
                              <Check className="size-3" />
                              Added
                            </>
                          ) : (
                            "Add to Tasks"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Open Questions */}
      {summary.open_questions && summary.open_questions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">
            Open Questions:
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.open_questions.map((question, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {question}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
