"use client";

import { useWorkspace } from "@/features/auth/workspace-provider";
import { StaffVisitors } from "./staff-visitors";
import { Visitors } from "./visitors";

export function VisitorsPage() {
  const { activeWorkspace } = useWorkspace();
  return activeWorkspace?.type === "resident" ? <Visitors /> : <StaffVisitors />;
}
