"use client";

import { createContext, useContext } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AuthenticatedUser, Workspace } from "./types";
import { resolveWorkspace } from "./workspaces";
import { getNavigation } from "@/components/layout/navigation";

interface WorkspaceState {
  user: AuthenticatedUser;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  preview: boolean;
  href: (path: string) => string;
  selectWorkspace: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({ user, workspaces, preview = false, children }: {
  user: AuthenticatedUser;
  workspaces: Workspace[];
  preview?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeWorkspace = resolveWorkspace(workspaces, params.get("workspace"));

  function href(path: string) {
    return `${path}${activeWorkspace ? `?workspace=${encodeURIComponent(activeWorkspace.id)}` : ""}`;
  }

  function selectWorkspace(id: string) {
    const workspace = workspaces.find((item) => item.id === id);
    if (!workspace) return;
    const target = getNavigation(workspace).find((item) => item.href === pathname)?.href ?? "/overview";
    // Only validated relationship IDs enter the URL; never accept an arbitrary role or estate.
    router.replace(`${target}?workspace=${encodeURIComponent(workspace.id)}`);
  }

  return (
    <WorkspaceContext.Provider value={{ user, workspaces, activeWorkspace, preview, href, selectWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}
