import type { Workspace } from "@/features/auth/types";

export const navigation = [
  { id: "overview", href: "/overview", label: "Overview", subtitle: "Your community, at a glance.", icon: "overview", workspaces: ["resident", "guard", "security", "manager", "organization"] },
  { id: "visitors", href: "/visitors", label: "Visitors", subtitle: "A warm welcome starts with a well-managed visit.", icon: "visitors", workspaces: ["resident"] },
  { id: "gate", href: "/gate", label: "Live Gate", subtitle: "A clear view of every arrival and departure.", icon: "gate", workspaces: ["guard", "security"] },
  { id: "access", href: "/access", label: "Access Activity", subtitle: "Keep track of movement across your community.", icon: "activity", workspaces: ["guard", "security", "manager"] },
] as const;

export type ScreenId = (typeof navigation)[number]["id"];
export type NavigationItem = (typeof navigation)[number];

/** Screen visibility only. Each future API operation must honor backend policies. */
export function getNavigation(workspace: Workspace): NavigationItem[] {
  return navigation.filter((item) => (item.workspaces as readonly string[]).includes(workspace.type));
}

export function getScreen(pathname: string): NavigationItem | undefined {
  return navigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
