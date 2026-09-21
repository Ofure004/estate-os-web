"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components";
import { useWorkspace } from "./workspace-provider";
import { cn } from "@/lib/utils";

export function WorkspacePicker({ compact = false }: { compact?: boolean }) {
  const { workspaces, activeWorkspace, selectWorkspace } = useWorkspace();
  if (!activeWorkspace) return null;

  const summary = <>
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-accent-foreground"><Building2 className="size-[18px]" aria-hidden="true" /></span>
    {!compact && <span className="min-w-0 flex-1 text-left"><span className="block truncate text-[12px] font-bold">{activeWorkspace.name}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{activeWorkspace.label} workspace</span></span>}
  </>;

  if (workspaces.length === 1) {
    return <div className={cn("flex items-center gap-2.5 rounded-xl bg-muted/70", compact ? "justify-center py-2" : "p-2.5")} title={compact ? `${activeWorkspace.name} · ${activeWorkspace.label}` : undefined}>{summary}</div>;
  }

  return (
    <Select aria-label="Workspace" selectedKey={activeWorkspace.id} onSelectionChange={(key) => { if (key) selectWorkspace(String(key)); }}>
      <Button className={cn("flex w-full items-center gap-2.5 rounded-xl bg-muted/70 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring", compact ? "justify-center py-2" : "p-2.5")} aria-label={`Switch workspace: ${activeWorkspace.name}, ${activeWorkspace.label}`}>
        {summary}<SelectValue className="sr-only" />{!compact && <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </Button>
      <Popover placement="bottom start" offset={8} className="z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-card p-1.5 shadow-lg">
        <ListBox items={workspaces} className="max-h-80 overflow-auto outline-none">
          {(workspace) => <ListBoxItem id={workspace.id} textValue={`${workspace.name} ${workspace.label}`} className="flex cursor-pointer items-center gap-3 rounded-lg p-3 outline-none data-focused:bg-muted data-selected:bg-accent">
            {({ isSelected }) => <><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{workspace.name}</span><span className="mt-1 block text-[11px] text-muted-foreground">{workspace.label}</span></span>{isSelected && <Check className="size-4 text-accent-foreground" aria-hidden="true" />}</>}
          </ListBoxItem>}
        </ListBox>
      </Popover>
    </Select>
  );
}
