"use client";

import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EstateBrand } from "@/components/layout/estate-brand";
import { signOut } from "./actions";
import { useWorkspace } from "./workspace-provider";

export function WorkspaceEntry() {
  const { workspaces, selectWorkspace, preview } = useWorkspace();
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-12">
      <EstateBrand className="mb-10" />
      <p className="text-xs font-bold uppercase tracking-widest text-accent-foreground">Your workspaces</p>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{workspaces.length ? "Where would you like to work?" : "No active workspace"}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{workspaces.length ? "Choose the community and workspace you want to open." : "You don’t have an active workspace available here. Contact your estate administrator for access."}</p>
      <div className="mt-8 flex flex-col gap-3">
        {workspaces.map((workspace) => <Button key={workspace.id} variant="outline" onPress={() => selectWorkspace(workspace.id)} className="h-auto justify-start gap-4 rounded-xl bg-card p-4 text-left whitespace-normal">
          <Building2 className="size-5 text-accent-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{workspace.name}</span><span className="mt-1 block text-xs text-muted-foreground">{workspace.label}</span></span>
          <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
        </Button>)}
      </div>
      {!preview && <form action={signOut} className="mt-6"><Button type="submit" variant="ghost">Sign out</Button></form>}
    </main>
  );
}
