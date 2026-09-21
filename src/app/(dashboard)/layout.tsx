import { redirect } from "next/navigation";
import { QueryProvider } from "@/features/access/query-provider";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AuthState } from "@/features/auth/auth-state";
import { loadDashboardContext } from "@/features/auth/server";
import { WorkspaceProvider } from "@/features/auth/workspace-provider";
import { deriveWorkspaces } from "@/features/auth/workspaces";
import Loading from "./loading";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const result = await loadDashboardContext();
  if (result.status === "unauthenticated") redirect("/login");
  const preview = process.env.NODE_ENV === "development" && result.status === "unconfigured";
  let context = result.status === "ready" ? result.context : null;
  if (preview) {
    const { getShellPreview } = await import("@/features/auth/dev-preview");
    context = getShellPreview();
  }
  if (!context) return <AuthState status={result.status === "ready" ? "unavailable" : result.status} />;

  return <Suspense fallback={<Loading />}>
    <WorkspaceProvider user={context.user} workspaces={deriveWorkspaces(context.relationships)} preview={preview}>
      <QueryProvider key={context.user.id}><DashboardShell>{children}</DashboardShell></QueryProvider>
    </WorkspaceProvider>
  </Suspense>;
}
