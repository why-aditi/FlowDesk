"use client";

import { useEffect, useState } from "react";
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
  Menu,
  Clock,
} from "lucide-react";
import { useWorkspaceStore, type WorkspaceTab } from "@/store/workspace";
import { createBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const NAV_ITEMS: { tab: WorkspaceTab; label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { tab: "home", label: "Home", href: "/workspace", icon: Home },
  { tab: "inbox", label: "Inbox", href: "/workspace/inbox", icon: Inbox },
  { tab: "research", label: "Research", href: "/workspace/research", icon: BookOpen },
  { tab: "planner", label: "Planner", href: "/workspace/planner", icon: Clock },
  { tab: "meetings", label: "Meetings", href: "/workspace/meetings", icon: Calendar },
  { tab: "tasks", label: "Tasks", href: "/workspace/tasks", icon: CheckSquare },
  { tab: "teams", label: "Teams", href: "/workspace/teams", icon: Users },
];

function pathnameToTab(pathname: string): WorkspaceTab {
  if (pathname === "/workspace") return "home";
  if (pathname.startsWith("/workspace/inbox")) return "inbox";
  if (pathname.startsWith("/workspace/research")) return "research";
  if (pathname.startsWith("/workspace/planner")) return "planner";
  if (pathname.startsWith("/workspace/meetings")) return "meetings";
  if (pathname.startsWith("/workspace/tasks")) return "tasks";
  if (pathname.startsWith("/workspace/teams")) return "teams";
  if (pathname.startsWith("/workspace/settings")) return "settings";
  return "home";
}

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
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

  const handleNavClick = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    onLinkClick?.();
  };

  return (
    <>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ tab, label, href, icon: Icon }) => {
          const isActive = activeTab === tab;
          return (
            <Link
              key={tab}
              href={href}
              onClick={() => handleNavClick(tab)}
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
            <DropdownMenuItem asChild>
              <Link
                href="/workspace/settings"
                onClick={() => {
                  handleNavClick("settings");
                }}
                className="flex cursor-pointer items-center"
              >
                <Settings className="mr-2 size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-background">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Button */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-40"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <aside className="flex h-full w-full flex-col border-r border-border bg-background">
            <SidebarContent onLinkClick={() => setMobileMenuOpen(false)} />
          </aside>
        </SheetContent>
      </Sheet>
    </>
  );
}
