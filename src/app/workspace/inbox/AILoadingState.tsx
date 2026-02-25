import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AILoadingState() {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-3">
        {/* Priority and Category Skeletons */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        {/* Sender and Subject Skeletons */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Action Banner Skeleton */}
        <Skeleton className="h-10 w-full rounded-md" />

        {/* Summary Skeletons */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Action Items Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <div className="space-y-1 pl-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
