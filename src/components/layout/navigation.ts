import type { Workspace } from "@/features/auth/types";

export const navigation = [
  { id: "overview", href: "/overview", label: "Overview", subtitle: "Your community, at a glance.", icon: "overview", workspaces: ["resident", "guard", "security", "manager", "organization"] },
  { id: "visitors", href: "/visitors", label: "Visitors", subtitle: "Expected, on-site, and completed visits in one clear view.", icon: "visitors", workspaces: ["resident", "guard", "security", "manager"] },
  { id: "gate", href: "/gate", label: "Live Gate", subtitle: "A clear view of every arrival and departure.", icon: "gate", workspaces: ["guard", "security"] },
  { id: "access", href: "/access", label: "Access Activity", subtitle: "Keep track of movement across your community.", icon: "activity", workspaces: ["guard", "security", "manager"] },
  { id: "onboarding", href: "/onboarding", label: "Onboarding", subtitle: "Invite residents and estate staff.", icon: "onboarding", workspaces: ["security", "manager", "organization"] },
] as const;

export type ScreenId = (typeof navigation)[number]["id"];
export type NavigationItem = (typeof navigation)[number];

/** Screen visibility only. Each future API operation must honor backend policies. */
export function getNavigation(workspace: Workspace): NavigationItem[] {
  return navigation.filter((item) => (item.workspaces as readonly string[]).includes(workspace.type) && (item.id !== "onboarding" || workspace.type !== "organization" || workspace.role !== "MEMBER"));
}

export function getScreen(pathname: string): NavigationItem | undefined {
  return navigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
