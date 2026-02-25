"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createBrowserClient } from "@/lib/supabase";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function getHourKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:00:00`;
}

export function PlannerProgressMobile() {
  const [plannerStats, setPlannerStats] = useState<{
    total: number;
    completed: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    const fetchPlannerStats = async () => {
      try {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        // Fetch all planner slots for statistics (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoKey = getHourKey(thirtyDaysAgo);

        const { data: allSlotsForStats } = await supabase
          .from("planner_slots")
          .select("is_done")
          .eq("user_id", user.id)
          .gte("hour", thirtyDaysAgoKey);

        // Calculate completion statistics
        if (allSlotsForStats) {
          const total = allSlotsForStats.length;
          const completed = allSlotsForStats.filter((slot) => slot.is_done).length;
          const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
          setPlannerStats({ total, completed, percentage });
        }
      } catch (err) {
        // Silently fail
      }
    };

    fetchPlannerStats();
  }, []);

  return (
    <Card className="lg:hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Planner Progress</CardTitle>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/workspace/planner">View</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {plannerStats === null ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : plannerStats.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            No planner data yet.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Last 30 days</span>
              <span className="font-bold text-lg">{plannerStats.percentage}%</span>
            </div>
            <Progress value={plannerStats.percentage} className="h-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
