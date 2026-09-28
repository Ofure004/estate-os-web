"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/features/auth/workspace-provider";
export const queryKeys = {
  invitations: (user: string, estate: string) => ["invitations", user, estate] as const,
  detail: (user: string, estate: string, id: string) => ["invitations", user, estate, id] as const,
  pass: (user: string, estate: string, id: string) => ["invitations", user, estate, id, "pass"] as const,
  access: (user: string, estate: string) => ["access", user, estate] as const,
  onsite: (user: string, estate: string) => ["access", user, estate, "onsite"] as const,
  activity: (user: string, estate: string, page: number) => ["access", user, estate, "activity", page] as const,
  staffVisitors: (user: string, estate: string) => ["staff-visitors", user, estate] as const,
  staffVisitorList: (user: string, estate: string, status: string, page: number) => ["staff-visitors", user, estate, status, page] as const,
  gates: (user: string, estate: string) => ["gates", user, estate] as const,
};
export function useScope() {
  const context = useWorkspace();
  const estate = context.activeWorkspace && "estateId" in context.activeWorkspace ? context.activeWorkspace.estateId : "";
  return { ...context, estate, userId: context.user.id, base: `estates/${encodeURIComponent(estate)}`, enabled: !!estate && !context.preview };
}
export function useRefreshAccess() {
  const client = useQueryClient(); const { userId, estate } = useScope();
  return () => Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.access(userId, estate) }),
    client.invalidateQueries({ queryKey: queryKeys.invitations(userId, estate) }),
    client.invalidateQueries({ queryKey: queryKeys.staffVisitors(userId, estate) }),
  ]);
}
