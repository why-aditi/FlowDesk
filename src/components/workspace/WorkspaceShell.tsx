"use client";

import { useEffect } from "react";
import { useWorkspaceStore, type WorkspaceUser } from "@/store/workspace";
import { Sidebar } from "./Sidebar";

interface WorkspaceShellProps {
  user: WorkspaceUser;
  children: React.ReactNode;
}

export function WorkspaceShell({ user, children }: WorkspaceShellProps) {
  const setUser = useWorkspaceStore((s) => s.setUser);

  useEffect(() => {
    setUser(user);
    return () => setUser(null);
  }, [user, setUser]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto lg:ml-0">{children}</main>
    </div>
  );
}
