import { create } from "zustand";

export type WorkspaceTab =
  | "home"
  | "inbox"
  | "research"
  | "planner"
  | "meetings"
  | "tasks"
  | "teams"
  | "settings";

export type WorkspaceUser = {
  id: string;
  email: string;
  full_name?: string;
} | null;

interface WorkspaceState {
  activeTab: WorkspaceTab;
  user: WorkspaceUser;
  setActiveTab: (tab: WorkspaceTab) => void;
  setUser: (user: WorkspaceUser) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeTab: "home",
  user: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setUser: (user) => set({ user }),
}));
