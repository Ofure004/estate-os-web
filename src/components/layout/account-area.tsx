"use client";

import { ChevronUp, LogOut, UserRound } from "lucide-react";
import { Dialog, DialogTrigger, Heading, Popover } from "react-aria-components";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/features/auth/workspace-provider";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

export function AccountArea({ compact = false }: { compact?: boolean }) {
  const { user, activeWorkspace, preview } = useWorkspace();
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const initials = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("") || user.email[0].toUpperCase();

  return (
    <DialogTrigger>
      <Button variant="outline" aria-label={`Account: ${name}`} className={cn("h-auto w-full gap-2.5 rounded-xl bg-card text-left shadow-none", compact ? "justify-center p-2" : "justify-start p-2.5")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-card">{initials}</span>
        {!compact && <><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-bold">{name}</span><span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">{preview ? "Preview account" : activeWorkspace?.label}</span></span><ChevronUp className="size-3.5 text-muted-foreground" aria-hidden="true" /></>}
      </Button>
      <Popover placement="top start" offset={10} className="z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-card p-4 shadow-lg">
        <Dialog className="outline-none">
          <Heading slot="title" className="flex items-center gap-2 text-sm font-bold"><UserRound className="size-4 text-accent-foreground" aria-hidden="true" />Your account</Heading>
          <p className="mt-4 text-sm font-semibold">{name}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p>
          <div className="my-4 border-t pt-3 text-xs leading-6"><p className="font-semibold">{activeWorkspace?.name}</p><p className="text-muted-foreground">{activeWorkspace?.label}</p></div>
          {preview ? <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">Sample account for this shell preview.</p> : <form action={signOut}><Button type="submit" variant="secondary" className="w-full"><LogOut className="size-4" aria-hidden="true" />Sign out</Button></form>}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
