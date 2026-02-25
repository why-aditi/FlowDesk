"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, X, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlannerSlot {
  id?: string;
  hour: string; // Format: "YYYY-MM-DDTHH:00:00"
  task_title: string;
  task_id?: string | null;
  is_done: boolean;
  created_at?: string;
}

interface HourSlot {
  hour: Date;
  slot: PlannerSlot | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

function formatHour(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getHourKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:00:00`;
}

function getNext8Hours(): Date[] {
  const now = new Date();
  const hours: Date[] = [];
  
  // Round up to the next hour
  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);
  if (now.getMinutes() > 0 || now.getSeconds() > 0 || now.getMilliseconds() > 0) {
    currentHour.setHours(currentHour.getHours() + 1);
  }

  for (let i = 0; i < 8; i++) {
    const hour = new Date(currentHour);
    hour.setHours(currentHour.getHours() + i);
    hours.push(hour);
  }

  return hours;
}


export function PlannerClient() {
  const [hourSlots, setHourSlots] = useState<HourSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allocatedTaskIds, setAllocatedTaskIds] = useState<Set<string>>(new Set());
  const [completionStats, setCompletionStats] = useState<{
    total: number;
    completed: number;
    percentage: number;
  }>({ total: 0, completed: 0, percentage: 0 });

  const loadPlannerData = useCallback(async () => {
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get current 8 hours
      const hours = getNext8Hours();
      const hourKeys = hours.map(getHourKey);
      const now = new Date();
      const currentHourKey = getHourKey(now);

      // Fetch planner slots for the next 8 hours
      const { data: nextSlots, error: nextError } = await supabase
        .from("planner_slots")
        .select("*")
        .eq("user_id", user.id)
        .in("hour", hourKeys)
        .order("hour", { ascending: true });

      // Fetch any past incomplete tasks
      const { data: pastSlots, error: pastError } = await supabase
        .from("planner_slots")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_done", false)
        .lte("hour", currentHourKey)
        .not("hour", "in", `(${hourKeys.join(",")})`)
        .order("hour", { ascending: true });

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
        setCompletionStats({ total, completed, percentage });
      }

      const error = nextError || pastError;
      const slots = [...(nextSlots || []), ...(pastSlots || [])];

      if (error) {
        console.error("Error loading planner slots:", error);
        toast.error("Failed to load planner");
      }

      // Get allocated task IDs
      const allocatedIds = new Set<string>();
      slots.forEach((slot) => {
        if (slot.task_id) {
          allocatedIds.add(slot.task_id);
        }
      });
      setAllocatedTaskIds(allocatedIds);

      // Fetch all todo tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, status")
        .eq("user_id", user.id)
        .eq("status", "todo")
        .order("created_at", { ascending: false });

      if (tasks) {
        setAllTasks(tasks);
      }

      // Map slots to hours
      const slotsMap = new Map<string, PlannerSlot>();
      if (slots) {
        slots.forEach((slot) => {
          slotsMap.set(slot.hour, slot);
        });
      }

      // Get all hours that have slots (including past incomplete ones)
      const allHourKeys = new Set(hourKeys);
      if (slots) {
        slots.forEach((slot) => {
          if (!slot.is_done) {
            allHourKeys.add(slot.hour);
          }
        });
      }

      // Create hour slots for all relevant hours
      const allHours = Array.from(allHourKeys)
        .map((key) => {
          // Parse hour key back to Date
          const [datePart, timePart] = key.split("T");
          const [year, month, day] = datePart.split("-").map(Number);
          const [hour] = timePart.split(":").map(Number);
          return new Date(year, month - 1, day, hour);
        })
        .sort((a, b) => a.getTime() - b.getTime())
        .slice(0, 12); // Show up to 12 hours (past incomplete + next 8)

      const hourSlotsData: HourSlot[] = allHours.map((hour) => ({
        hour,
        slot: slotsMap.get(getHourKey(hour)) || null,
      }));

      setHourSlots(hourSlotsData);
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading planner:", err);
      toast.error("Failed to load planner");
      setIsLoading(false);
    }
  }, []);

  // Filter tasks to only show unallocated todo tasks
  const unallocatedTasks = useMemo(() => {
    return allTasks.filter((task) => !allocatedTaskIds.has(task.id));
  }, [allTasks, allocatedTaskIds]);

  useEffect(() => {
    loadPlannerData();

    // Auto-update every hour
    const interval = setInterval(() => {
      loadPlannerData();
    }, 60 * 60 * 1000); // 1 hour

    // Also update when the hour changes
    const now = new Date();
    const msUntilNextHour =
      (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
    const timeout = setTimeout(() => {
      loadPlannerData();
      // Then set up hourly interval
      const hourlyInterval = setInterval(loadPlannerData, 60 * 60 * 1000);
      return () => clearInterval(hourlyInterval);
    }, msUntilNextHour);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [loadPlannerData]);

  const handleAssignTask = async (hour: Date, taskId: string) => {
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const task = allTasks.find((t) => t.id === taskId);
      if (!task) {
        toast.error("Task not found");
        return;
      }

      const hourKey = getHourKey(hour);

      // Check if slot already exists
      const { data: existing } = await supabase
        .from("planner_slots")
        .select("id")
        .eq("user_id", user.id)
        .eq("hour", hourKey)
        .single();

      if (existing) {
        // Update existing slot
        const { error } = await supabase
          .from("planner_slots")
          .update({
            task_title: task.title,
            task_id: task.id,
            is_done: false,
          })
          .eq("id", existing.id);

        if (error) throw error;
        toast.success("Task updated");
      } else {
        // Create new slot
        const { error } = await supabase.from("planner_slots").insert({
          user_id: user.id,
          hour: hourKey,
          task_title: task.title,
          task_id: task.id,
          is_done: false,
        });

        if (error) throw error;
        toast.success("Task assigned");
      }

      loadPlannerData();
    } catch (err) {
      console.error("Error assigning task:", err);
      toast.error("Failed to assign task");
    }
  };

  const handleToggleDone = async (slot: PlannerSlot) => {
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !slot.id) return;

      const { error } = await supabase
        .from("planner_slots")
        .update({ is_done: !slot.is_done })
        .eq("id", slot.id);

      if (error) throw error;

      loadPlannerData();
    } catch (err) {
      console.error("Error toggling done status:", err);
      toast.error("Failed to update status");
    }
  };

  const handleRemoveTask = async (slot: PlannerSlot) => {
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !slot.id) return;

      const { error } = await supabase
        .from("planner_slots")
        .delete()
        .eq("id", slot.id);

      if (error) throw error;

      toast.success("Task removed");
      loadPlannerData();
    } catch (err) {
      console.error("Error removing task:", err);
      toast.error("Failed to remove task");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading planner...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 h-full flex flex-col gap-4">
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">Hour Planner</h1>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base text-muted-foreground">
          Plan your next 8 hours. Assign tasks and track your progress.
        </p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden">
        {/* Left side - Time blocks */}
        <div className="flex-1 overflow-y-auto min-w-0 order-1 lg:order-1">
          <div className="space-y-2">
            {hourSlots.map((hourSlot, index) => {
              const isPast = hourSlot.hour < new Date();
              const isCurrentHour =
                hourSlot.hour.getHours() === new Date().getHours() &&
                hourSlot.hour.getDate() === new Date().getDate() &&
                hourSlot.hour.getMonth() === new Date().getMonth() &&
                hourSlot.hour.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-card",
                    isPast && "opacity-60",
                    isCurrentHour && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex-shrink-0 w-full sm:w-20">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-xs sm:text-sm">
                        {formatHour(hourSlot.hour)}
                      </p>
                      {isCurrentHour && (
                        <Badge variant="default" className="text-xs px-1.5 py-0.5">
                          Now
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                      {hourSlot.hour.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 w-full sm:w-auto">
                    {hourSlot.slot ? (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {hourSlot.slot.task_title}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleDone(hourSlot.slot!)}
                            className={cn(
                              "flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-md border-2 transition-all",
                              hourSlot.slot.is_done
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50"
                            )}
                            aria-label={hourSlot.slot.is_done ? "Mark as not done" : "Mark as done"}
                          >
                            {hourSlot.slot.is_done ? (
                              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            ) : (
                              <Circle className="h-4 w-4 sm:h-5 sm:w-5" />
                            )}
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                            onClick={() => handleRemoveTask(hourSlot.slot!)}
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          {unallocatedTasks.length === 0 ? (
                            <div className="text-xs sm:text-sm text-muted-foreground py-1.5 sm:py-2 px-2 sm:px-3">
                              No unallocated tasks
                            </div>
                          ) : (
                            <Select
                              onValueChange={(value) => {
                                if (value) {
                                  handleAssignTask(hourSlot.hour, value);
                                }
                              }}
                            >
                              <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                                <SelectValue placeholder="Select a task..." />
                              </SelectTrigger>
                              <SelectContent>
                                {unallocatedTasks.map((task) => (
                                  <SelectItem key={task.id} value={task.id}>
                                    {task.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side - Completion statistics */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col order-2 lg:order-2">
          <Card className="sticky top-0">
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <CardTitle className="text-base sm:text-lg">Your Progress</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">

              {/* Overall Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Last 30 days</span>
                  <span className="font-bold text-base sm:text-lg">{completionStats.percentage}%</span>
                </div>
                <Progress value={completionStats.percentage} className="h-3 sm:h-4" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{completionStats.completed} completed</span>
                  <span>{completionStats.total} total</span>
                </div>
              </div>

              {/* Pie Chart Visualization */}
              {completionStats.total > 0 && (
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-xs sm:text-sm font-medium">Task Distribution</h3>
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth="20"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="20"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionStats.percentage / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-lg sm:text-xl md:text-2xl font-bold">{completionStats.percentage}%</p>
                        <p className="text-xs text-muted-foreground">Complete</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats Summary */}
              <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-semibold text-green-600 dark:text-green-400 text-sm sm:text-base">
                    {completionStats.completed}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400 text-sm sm:text-base">
                    {completionStats.total - completionStats.completed}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
