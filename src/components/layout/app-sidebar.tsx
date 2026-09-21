"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspacePicker } from "@/features/auth/workspace-picker";
import { useWorkspace } from "@/features/auth/workspace-provider";
import { EstateBrand } from "./estate-brand";
import { AccountArea } from "./account-area";
import { getNavigation } from "./navigation";
import { ScreenIcon } from "./screen-icon";
import { cn } from "@/lib/utils";

export function AppSidebar({ pathname, collapsed = false, onToggle, onNavigate }: {
  pathname: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const { activeWorkspace, href } = useWorkspace();
  if (!activeWorkspace) return null;

  return (
    <div className="flex h-full flex-col px-3.5 pb-4 pt-6">
      <Link href={href("/overview")} onClick={onNavigate} aria-label="EstateOS overview" className={cn("mb-7 flex w-fit rounded-md", collapsed ? "mx-auto" : "ml-2.5")}><EstateBrand compact={collapsed} /></Link>
      <WorkspacePicker compact={collapsed} />
      <div className={cn("mb-2.5 mt-7 text-[10px] font-bold tracking-[0.12em] text-muted-foreground", collapsed ? "text-center" : "px-3")}>{collapsed ? "MENU" : "ACCESS MANAGEMENT"}</div>
      <nav aria-label="Main navigation" className="flex flex-col gap-1">
        {getNavigation(activeWorkspace).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link key={item.id} href={href(item.href)} onClick={onNavigate} aria-current={active ? "page" : undefined} aria-label={collapsed ? item.label : undefined} title={collapsed ? item.label : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-lg text-[13px] font-semibold transition-colors", collapsed ? "justify-center px-2" : "px-3", active ? "bg-accent text-accent-foreground" : "text-secondary-foreground hover:bg-muted hover:text-foreground")}>
            <ScreenIcon icon={item.icon} className="size-[19px] shrink-0" />
            {!collapsed && <><span className="flex-1">{item.label}</span>{active && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}</>}
          </Link>;
        })}
      </nav>
      <div className="mt-auto pt-10">
        {onToggle && <Button variant="ghost" onPress={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} className={cn("mb-4 text-muted-foreground", collapsed ? "w-full px-0" : "gap-2.5 px-3 text-[11px]")}>
          {collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /><span>Collapse sidebar</span></>}
        </Button>}
        <AccountArea compact={collapsed} />
      </div>
    </div>
  );
}
