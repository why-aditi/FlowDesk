import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TriageCardProps {
  triage: {
    summary: string;
    category?: string;
    priority?: "high" | "medium" | "low";
    sender?: string;
    subject?: string;
    action_required?: boolean;
    deadline?: string | null;
    actionItems?: string[];
  };
}

function getPriorityColor(priority?: "high" | "medium" | "low") {
  switch (priority) {
    case "high":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "medium":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "low":
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

function formatDeadline(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  try {
    // Detect date-only strings (e.g., "2024-01-15") and append "T00:00:00" to force local-midnight parsing
    let dateString = deadline;
    if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      dateString = `${deadline}T00:00:00`;
    }
    
    const date = new Date(dateString);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return null;
  }
}

export function TriageCard({ triage }: TriageCardProps) {
  const deadlineFormatted = formatDeadline(triage.deadline);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-3">
        {/* Priority and Category Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {triage.priority && (
            <Badge
              variant="outline"
              className={cn(
                "border font-medium",
                getPriorityColor(triage.priority)
              )}
            >
              {triage.priority.toUpperCase()}
            </Badge>
          )}
          {triage.category && (
            <Badge variant="secondary" className="text-xs">
              {triage.category}
            </Badge>
          )}
          {deadlineFormatted && (
            <Badge variant="outline" className="text-xs">
              Due: {deadlineFormatted}
            </Badge>
          )}
        </div>

        {/* Sender and Subject */}
        {(triage.sender || triage.subject) && (
          <div className="space-y-1">
            {triage.sender && (
              <p className="text-sm font-medium text-foreground">
                From: {triage.sender}
              </p>
            )}
            {triage.subject && (
              <p className="text-sm text-muted-foreground">
                {triage.subject}
              </p>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Action Required Banner */}
        {triage.action_required && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-4 shrink-0" />
            <span className="font-medium">Action Required</span>
          </div>
        )}

        {/* Summary */}
        <div>
          <p className="text-sm text-foreground leading-relaxed">
            {triage.summary}
          </p>
        </div>

        {/* Action Items */}
        {triage.actionItems && triage.actionItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Action Items:
            </p>
            <ul className="space-y-1">
              {triage.actionItems.map((item, index) => (
                <li
                  key={index}
                  className="text-sm text-foreground flex items-start gap-2"
                >
                  <span className="text-muted-foreground mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
