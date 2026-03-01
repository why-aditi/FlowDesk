"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, X, Sparkles, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TimeScale = "day" | "week" | "month" | "year";

interface PlannerSlot {
  id?: string;
  period_key: string;
  time_scale: TimeScale;
  task_title: string;
  task_id?: string | null;
  is_done: boolean;
  created_at?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

// -- Date Utility Functions --

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getISOWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatTime(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

function getPeriodKey(date: Date, scale: "hour" | "day" | TimeScale): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  if (scale === "hour" || scale === "day") {
    // For day views, we still store slots at the hour resolution
    return date.toISOString();
  } else if (scale === "week") {
    // We store weekly tasks by the week number
    return `${year}-W${String(getISOWeekNumber(date)).padStart(2, "0")}`;
  } else if (scale === "month") {
    return `${year}-${month}`;
  } else if (scale === "year") {
    return `${year}`;
  }
  return date.toISOString();
}

function getVisibleRange(currentDate: Date, scale: TimeScale) {
  const start = new Date(currentDate);
  const end = new Date(currentDate);

  if (scale === "day") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (scale === "week") {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + (6 - day));
    end.setHours(23, 59, 59, 999);
  } else if (scale === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);

    // adjust start to sunday, end to saturday for calendar grid
    start.setDate(start.getDate() - start.getDay());
    end.setDate(end.getDate() + (6 - end.getDay()));
  } else if (scale === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function addTime(date: Date, amount: number, scale: TimeScale) {
  const d = new Date(date);
  if (scale === "day") d.setDate(d.getDate() + amount);
  else if (scale === "week") d.setDate(d.getDate() + amount * 7);
  else if (scale === "month") d.setMonth(d.getMonth() + amount);
  else if (scale === "year") d.setFullYear(d.getFullYear() + amount);
  return d;
}

function generateKeysForRange(start: Date, end: Date, scale: TimeScale): { keys: string[], queryScale: TimeScale | "hour" } {
  const keys: string[] = [];
  let current = new Date(start);

  if (scale === "day" || scale === "week") {
    // For day and week views, we query hourly slots
    while (current <= end) {
      keys.push(getPeriodKey(current, "hour"));
      current.setHours(current.getHours() + 1);
    }
    return { keys, queryScale: "hour" }; // 'hour' in db is equivalent to 'day' resolution
  } else if (scale === "month") {
    // For month views, we show tasks assigned to specific daily slots OR to the month itself
    // We'll fetch daily slots (hourly actually since db forces hourly for dates) 
    // This is a simplification: we'll just fetch all hourly slots in the month
    while (current <= end) {
      keys.push(getPeriodKey(current, "hour"));
      current.setDate(current.getDate() + 1); // move date safely
    }
    // Actually, for month/year, querying hundreds of hourly keys via `in` might be large.
    // But for this demo we'll allow it or rely on range queries if we could.
  }
  return { keys: [], queryScale: scale };
}


function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

interface SlotCardProps {
  slot: PlannerSlot | undefined;
  onAssign: (taskId: string) => void;
  onToggleDone: (slot: PlannerSlot, e: React.MouseEvent) => void;
  onRemove: (slot: PlannerSlot, e: React.MouseEvent) => void;
  unallocatedTasks: Task[];
}

const SlotCard = ({ slot, onAssign, onToggleDone, onRemove, unallocatedTasks }: SlotCardProps) => {
  const [open, setOpen] = useState(false);

  if (slot) {
    return (
      <div className={cn(
        "h-full w-full p-1.5 sm:p-2 rounded-md border text-xs sm:text-sm flex flex-col transition-all cursor-pointer",
        slot.is_done
          ? "bg-muted/50 border-muted opacity-60 hover:opacity-100"
          : "bg-primary/10 border-primary/20 hover:bg-primary/15 shadow-sm"
      )}>
        <div className="font-medium truncate mb-1 pr-6 flex-1 text-foreground">
          {slot.task_title}
        </div>
        <div className="flex items-center gap-1.5 mt-auto">
          <button
            onClick={(e) => onToggleDone(slot, e)}
            className={cn(
              "h-5 w-5 rounded shadow-sm border flex items-center justify-center transition-colors",
              slot.is_done ? "bg-primary border-primary text-primary-foreground" : "bg-background hover:border-primary"
            )}
          >
            {slot.is_done && <CheckCircle2 className="h-3 w-3" />}
          </button>
          <button
            onClick={(e) => onRemove(slot, e)}
            className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="h-full w-full p-2 opacity-0 group-hover:opacity-100 transition-all bg-transparent cursor-pointer flex items-center justify-center border-2 border-transparent group-hover:border-dashed group-hover:border-muted-foreground/30">
          <span className="text-xs text-muted-foreground font-medium">+ Task</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Task</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {unallocatedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending tasks.</p>
          ) : (
            <Select onValueChange={(val) => {
              onAssign(val);
              setOpen(false);
            }}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Select a task..." />
              </SelectTrigger>
              <SelectContent>
                {unallocatedTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface MonthDayCellProps {
  date: Date;
  i: number;
  daySlots: PlannerSlot[];
  currentDate: Date;
  unallocatedTasks: Task[];
  onToggleDone: (slot: PlannerSlot, e: React.MouseEvent) => void;
  onAssignTask: (date: Date, scale: "hour" | TimeScale, taskId: string) => void;
}

const MonthDayCell = ({ date, i, daySlots, currentDate, unallocatedTasks, onToggleDone, onAssignTask }: MonthDayCellProps) => {
  const [open, setOpen] = useState(false);
  const isToday = isSameDay(date, new Date());
  const isCurrentMonth = date.getMonth() === currentDate.getMonth();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className={cn(
          "border-r border-b min-h-[100px] p-1 sm:p-2 transition-colors hover:bg-muted/5 group cursor-pointer relative",
          !isCurrentMonth && "bg-muted/20 text-muted-foreground",
          (i % 7 === 6) && "border-r-0"
        )}>
          <div className="flex justify-between items-start mb-1">
            <span className={cn(
              "h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-full text-xs sm:text-sm",
              isToday ? "bg-primary text-primary-foreground font-bold" : (isCurrentMonth ? "font-medium" : "font-normal")
            )}>
              {date.getDate()}
            </span>
          </div>

          <div className="space-y-1 mt-1 sm:mt-2 max-h-[80px] sm:max-h-[120px] overflow-y-auto no-scrollbar">
            {daySlots.slice(0, 4).map((slot, idx) => (
              <div
                key={idx}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleDone(slot, e as any);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  "text-[10px] sm:text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors relative z-10",
                  slot.is_done ? "bg-muted text-muted-foreground line-through" : "bg-primary/20 text-foreground hover:bg-primary/30"
                )}
              >
                <span className="opacity-60 mr-1">{slot.period_key.substring(11, 16)}</span>
                {slot.task_title}
              </div>
            ))}
            {daySlots.length > 4 && (
              <div className="text-[10px] text-muted-foreground font-medium px-1">
                +{daySlots.length - 4} more
              </div>
            )}
          </div>
          {/* Hover indicator for adding task */}
          <div className="absolute inset-x-0 bottom-1 flex justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <span className="text-[10px] font-medium text-muted-foreground">+ Add Task</span>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign to {date.toLocaleDateString()}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {unallocatedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending tasks.</p>
          ) : (
            <Select onValueChange={(taskId) => {
              const target = new Date(date);
              target.setHours(9, 0, 0, 0);
              onAssignTask(target, "hour", taskId);
              setOpen(false);
            }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select task..." />
              </SelectTrigger>
              <SelectContent>
                {unallocatedTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


export function PlannerClient() {
  const [timeScale, setTimeScale] = useState<TimeScale>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<PlannerSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allocatedTaskIds, setAllocatedTaskIds] = useState<Set<string>>(new Set());
  const [completionStats, setCompletionStats] = useState({ total: 0, completed: 0, percentage: 0 });
  const [now, setNow] = useState(new Date());

  const scrollRef = useRef<HTMLDivElement>(null);

  // Update "now" for the red line every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to roughly 8 AM on load
  useEffect(() => {
    if (scrollRef.current && (timeScale === "day" || timeScale === "week")) {
      const rowHeight = 60; // Approximate height of one hour row in px
      scrollRef.current.scrollTop = 8 * rowHeight;
    }
  }, [timeScale]);

  const loadPlannerData = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      const { start, end } = getVisibleRange(currentDate, timeScale);

      // Because we altered the DB to support time_scale and period_key
      // For Day/Week views, we want to fetch the 'hour' timescale slots that fall between start and end.

      let queryScale: "hour" | TimeScale = timeScale === "day" || timeScale === "week" ? "hour" : timeScale;
      // Also fetch "day" level tasks if we had them, but for this implementation we'll treat Day/Week grids as Hour-level assignments.

      // Supabase range query on period_key for simple string comparison (works for ISO strings!)
      const isoStart = start.toISOString();
      const isoEnd = end.toISOString();

      const { data: rangeSlots, error } = await supabase
        .from("planner_slots")
        .select("*")
        .eq("user_id", user.id)
        .eq("time_scale", queryScale)
        .gte("period_key", isoStart)
        .lte("period_key", isoEnd);

      // For completion stats, we get everything in the last 30 days regardless of scale for simplicity (or just current view)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: statsData } = await supabase
        .from("planner_slots")
        .select("is_done")
        .eq("user_id", user.id)
        .gte("period_key", thirtyDaysAgo.toISOString());

      if (statsData) {
        const total = statsData.length;
        const completed = statsData.filter((s) => s.is_done).length;
        setCompletionStats({
          total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        });
      }

      if (error && error.code !== "PGRST116") console.error("Error loading planner:", error);

      const fetchedSlots = (rangeSlots || []).map(s => ({
        ...s,
        period_key: s.period_key || s.hour || ""
      }));

      // Filter fetchedSlots precisely in memory
      const filteredSlots = fetchedSlots.filter(s => {
        return s.period_key >= isoStart && s.period_key <= isoEnd;
      });

      setSlots(filteredSlots);

      const allocated = new Set<string>();
      fetchedSlots.forEach((s) => {
        if (s.task_id) {
          allocated.add(s.task_id);
        }
      });
      setAllocatedTaskIds(allocated);

      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, status")
        .eq("user_id", user.id)
        .eq("status", "todo");
      if (tasks) setAllTasks(tasks);

      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  }, [currentDate, timeScale]);

  useEffect(() => {
    loadPlannerData();
  }, [loadPlannerData]);

  const handleNext = () => setCurrentDate(prev => addTime(prev, 1, timeScale));
  const handlePrev = () => setCurrentDate(prev => addTime(prev, -1, timeScale));
  const handleToday = () => setCurrentDate(new Date());

  const handleAssignTask = async (date: Date, scale: "hour" | TimeScale, taskId: string) => {
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error("Not authenticated");

      const task = allTasks.find((t) => t.id === taskId);
      if (!task) return toast.error("Task not found");

      const periodKey = getPeriodKey(date, scale);

      const { data: existing } = await supabase
        .from("planner_slots")
        .select("id")
        .eq("user_id", user.id)
        .eq("period_key", periodKey)
        .eq("time_scale", scale)
        .single();

      if (existing) {
        await supabase
          .from("planner_slots")
          .update({ task_title: task.title, task_id: task.id, is_done: false })
          .eq("id", existing.id);
      } else {
        const { error } = await supabase.from("planner_slots").insert({
          user_id: user.id, period_key: periodKey, time_scale: scale, task_title: task.title, task_id: task.id, is_done: false,
        });
        if (error) {
          if ((error as any).code === "42703") { // fallback for legacy schema
            const { error: fallbackError } = await supabase.from("planner_slots").insert({
              user_id: user.id, hour: periodKey, task_title: task.title, task_id: task.id, is_done: false,
            } as any);
            if (fallbackError) {
              console.error(fallbackError);
              throw fallbackError;
            }
          } else throw error;
        }
      }
      toast.success("Task assigned");
      loadPlannerData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign task");
    }
  };

  const handleToggleDone = async (slot: PlannerSlot, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!slot.id) return;
      const supabase = createBrowserClient();
      await supabase.from("planner_slots").update({ is_done: !slot.is_done }).eq("id", slot.id);
      loadPlannerData();
    } catch (err) { toast.error("Failed to update status") }
  };

  const handleRemoveTask = async (slot: PlannerSlot, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!slot.id) return;
      const supabase = createBrowserClient();
      await supabase.from("planner_slots").delete().eq("id", slot.id);
      toast.success("Removed");
      loadPlannerData();
    } catch (err) { toast.error("Failed to remove task") }
  };

  const unallocatedTasks = useMemo(() => allTasks.filter(t => !allocatedTaskIds.has(t.id)), [allTasks, allocatedTaskIds]);

  // -- RENDER HELPERS --

  const getHeaderLabel = () => {
    if (timeScale === "day") return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (timeScale === "week") {
      const { start, end } = getVisibleRange(currentDate, "week");
      if (start.getMonth() === end.getMonth()) return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getFullYear()}`;
      return `${start.toLocaleDateString("en-US", { month: "short" })} - ${end.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
    }
    if (timeScale === "month") return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    return currentDate.getFullYear().toString();
  };

  const renderCurrentTimeLine = () => {
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
    const topPercentage = (minutesSinceMidnight / (24 * 60)) * 100;
    return (
      <div
        className="absolute w-full border-t-2 border-red-500 z-10 pointer-events-none"
        style={{ top: `calc(${topPercentage}% - 1px)` }}
      >
        <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
      </div>
    );
  };

  const renderDayColumn = (date: Date) => {
    const isToday = isSameDay(date, new Date());
    return (
      <div className="flex-1 min-w-[120px] relative border-r last:border-r-0">
        {/* Hour Cells */}
        {HOURS.map((hour) => {
          const cellDate = new Date(date);
          cellDate.setHours(hour, 0, 0, 0);
          const key = getPeriodKey(cellDate, "hour");
          const slot = slots.find(s => s.period_key === key);

          return (
            <div key={hour} className="h-16 sm:h-20 border-b relative group">
              <div className="absolute inset-x-1 inset-y-1">
                <SlotCard
                  slot={slot}
                  onAssign={(taskId) => handleAssignTask(cellDate, "hour", taskId)}
                  onToggleDone={handleToggleDone}
                  onRemove={handleRemoveTask}
                  unallocatedTasks={unallocatedTasks}
                />
              </div>
            </div>
          );
        })}
        {isToday && renderCurrentTimeLine()}
      </div>
    );
  };

  const renderWeekGrid = () => {
    const { start } = getVisibleRange(currentDate, "week");
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });

    return (
      <div className="flex flex-col h-full bg-card rounded-lg border overflow-hidden">
        {/* Header Dates */}
        <div className="flex border-b sticky top-0 bg-card z-20 shadow-sm">
          <div className="w-16 sm:w-20 shrink-0 border-r flex flex-col items-center justify-end pb-2">
            <span className="text-[10px] text-muted-foreground font-medium">GMT / Local</span>
          </div>
          {weekDays.map((date, i) => {
            const today = isSameDay(date, new Date());
            return (
              <div key={i} className="flex-1 min-w-[120px] border-r last:border-r-0 py-3 text-center">
                <div className={cn("text-xs font-medium uppercase tracking-wider mb-1", today ? "text-primary" : "text-muted-foreground")}>
                  {DAYS_OF_WEEK[date.getDay()]}
                </div>
                <div className={cn(
                  "text-xl sm:text-2xl font-light h-10 w-10 sm:h-12 sm:w-12 mx-auto flex items-center justify-center rounded-full",
                  today && "bg-primary text-primary-foreground font-medium"
                )}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Hours Grid */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="flex relative">
            {/* Time Labels */}
            <div className="w-16 sm:w-20 shrink-0 border-r bg-muted/10 relative">
              {HOURS.map((hour) => (
                <div key={hour} className="h-16 sm:h-20 border-b relative">
                  <span className="absolute -top-3 sm:-top-3.5 right-2 text-[10px] sm:text-xs text-muted-foreground font-medium pr-1">
                    {formatTime(hour)}
                  </span>
                </div>
              ))}
            </div>

            {/* Days Columns */}
            {weekDays.map((date, i) => (
              <div key={i} className="flex-1 min-w-[120px] relative border-r last:border-r-0">
                {HOURS.map((hour) => {
                  const cellDate = new Date(date);
                  cellDate.setHours(hour, 0, 0, 0);
                  const key = getPeriodKey(cellDate, "hour");
                  const slot = slots.find(s => s.period_key === key);

                  // Add alternating background for legibility
                  const isEven = hour % 2 === 0;

                  return (
                    <div key={hour} className={cn("h-16 sm:h-20 border-b relative group", isEven && "bg-muted/5")}>
                      <div className="absolute inset-x-[2px] inset-y-[2px]">
                        <SlotCard
                          slot={slot}
                          onAssign={(taskId) => handleAssignTask(cellDate, "hour", taskId)}
                          onToggleDone={handleToggleDone}
                          onRemove={handleRemoveTask}
                          unallocatedTasks={unallocatedTasks}
                        />
                      </div>
                    </div>
                  );
                })}
                {isSameDay(date, new Date()) && renderCurrentTimeLine()}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthGrid = () => {
    const { start, end } = getVisibleRange(currentDate, "month");
    const days: Date[] = [];
    let d = new Date(start);
    while (d <= end) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }

    return (
      <div className="flex flex-col h-full bg-card rounded-lg border overflow-hidden">
        <div className="grid grid-cols-7 border-b shrink-0 bg-muted/30">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 min-h-[500px]">
          {days.map((date, i) => {
            const startOfDayStr = getPeriodKey(date, "hour").substring(0, 10);
            const daySlots = slots.filter(s => s.period_key.startsWith(startOfDayStr));

            return (
              <MonthDayCell
                key={i}
                date={date}
                i={i}
                daySlots={daySlots}
                currentDate={currentDate}
                unallocatedTasks={unallocatedTasks}
                onToggleDone={handleToggleDone}
                onAssignTask={handleAssignTask}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderGrid = () => {
    if (isLoading) {
      return (
        <div className="h-full flex items-center justify-center flex-col gap-4 bg-muted/10 rounded-lg border border-dashed">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium">Loading Calendar...</p>
        </div>
      );
    }

    if (timeScale === "month" || timeScale === "year") {
      return renderMonthGrid();
    }
    return renderWeekGrid();
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 h-full flex flex-col gap-4 bg-background max-h-screen">

      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-card p-3 rounded-lg border shadow-sm">

        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleToday} className="font-medium shrink-0 h-9">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-9 w-9 rounded-full"><ChevronLeft className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-9 w-9 rounded-full"><ChevronRight className="h-5 w-5" /></Button>
          </div>
          <h2 className="text-base sm:text-lg md:text-xl font-medium tracking-tight whitespace-nowrap hidden lg:block">
            {getHeaderLabel()}
          </h2>
        </div>

        {/* Mobile Header Label */}
        <h2 className="text-base font-medium tracking-tight lg:hidden w-full text-center">
          {getHeaderLabel()}
        </h2>

        {/* View Switches */}
        <div className="flex bg-muted/50 p-1 rounded-md border w-full sm:w-auto shrink-0">
          {(["day", "week", "month"] as TimeScale[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeScale(t)}
              className={cn(
                "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-sm transition-all capitalize",
                timeScale === t
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 overflow-hidden">
        {renderGrid()}
      </div>

    </div>
  );
}
