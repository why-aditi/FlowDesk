import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KnowledgeCardProps {
  entry: {
    id: string;
    question: string;
    answer: string;
    source_note_id?: string;
    source_note_title?: string;
    created_at: string;
  };
}

export function KnowledgeCard({ entry }: KnowledgeCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <h3 className="font-semibold text-foreground">{entry.question}</h3>
        {entry.source_note_title && (
          <Badge variant="secondary" className="text-xs w-fit">
            From: {entry.source_note_title}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {entry.answer}
        </p>
        <p className="text-xs text-muted-foreground">
          Added {new Date(entry.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
