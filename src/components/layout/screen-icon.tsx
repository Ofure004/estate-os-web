import { DoorOpen, LayoutDashboard, ListFilter, UserRoundPlus, UsersRound } from "lucide-react";
import type { NavigationItem } from "./navigation";

const icons = { overview: LayoutDashboard, visitors: UsersRound, gate: DoorOpen, activity: ListFilter, onboarding: UserRoundPlus };

export function ScreenIcon({ icon, className }: { icon: NavigationItem["icon"]; className?: string }) {
  const Icon = icons[icon];
  return <Icon className={className} strokeWidth={1.8} aria-hidden="true" />;
}
