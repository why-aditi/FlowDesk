"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Inbox,
  BookOpen,
  Calendar,
  CheckSquare,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { useWorkspaceStore, type WorkspaceTab } from "@/store/workspace";
import { createBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS: { tab: WorkspaceTab; label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { tab: "home", label: "Home", href: "/workspace", icon: Home },
  { tab: "inbox", label: "Inbox", href: "/workspace/inbox", icon: Inbox },
  { tab: "research", label: "Research", href: "/workspace/research", icon: BookOpen },
  { tab: "meetings", label: "Meetings", href: "/workspace/meetings", icon: Calendar },
  { tab: "tasks", label: "Tasks", href: "/workspace/tasks", icon: CheckSquare },
  { tab: "teams", label: "Teams", href: "/workspace/teams", icon: Users },
  { tab: "settings", label: "Settings", href: "/workspace/settings", icon: Settings },
];

function pathnameToTab(pathname: string): WorkspaceTab {
  if (pathname === "/workspace") return "home";
  if (pathname.startsWith("/workspace/inbox")) return "inbox";
  if (pathname.startsWith("/workspace/research")) return "research";
  if (pathname.startsWith("/workspace/meetings")) return "meetings";
  if (pathname.startsWith("/workspace/tasks")) return "tasks";
  if (pathname.startsWith("/workspace/teams")) return "teams";
  if (pathname.startsWith("/workspace/settings")) return "settings";
  return "home";
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeTab, setActiveTab, user } = useWorkspaceStore();

  useEffect(() => {
    setActiveTab(pathnameToTab(pathname));
  }, [pathname, setActiveTab]);

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    useWorkspaceStore.getState().setUser(null);
    router.push("/login");
  }

  const displayName = user?.full_name?.trim() || user?.email || "User";
  const fallbackLetter = (user?.full_name?.[0] || user?.email?.[0] || "?").toUpperCase();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-background">
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ tab, label, href, icon: Icon }) => {
          const isActive = activeTab === tab;
          return (
            <Link
              key={tab}
              href={href}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open user menu"
            >
              <Avatar className="size-8 shrink-0">
                <AvatarFallback>{fallbackLetter}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 truncate text-muted-foreground">
                {displayName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
