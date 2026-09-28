"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { date, Empty, ErrorNotice, Loading, PreviewNotice, Status } from "@/features/access/ui";
import { useWorkspace } from "@/features/auth/workspace-provider";
import { adminInvitationRequest, invitationPermissions, residencyTypes, type CreatedInvitation, type InvitationRecord } from "./model";

function records(value: InvitationRecord[] | { data: InvitationRecord[] }): InvitationRecord[] { return Array.isArray(value) ? value : value.data; }
function title(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function OnboardingAdmin() {
  const { activeWorkspace, workspaces, user, preview } = useWorkspace();
  const permissions = invitationPermissions(activeWorkspace);
  const scopedEstate = activeWorkspace && "estateId" in activeWorkspace ? activeWorkspace.estateId : "";
  const [selectedEstate, setSelectedEstate] = useState("");
  const estate = scopedEstate || selectedEstate.trim();
  const [kind, setKind] = useState<"resident" | "staff">(permissions.resident ? "resident" : "staff");
  const [validation, setValidation] = useState<Error | null>(null);
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [copied, setCopied] = useState(false);
  const client = useQueryClient();
  const key = ["onboarding", user.id, estate];
  const list = useQuery({ queryKey: key, queryFn: ({ signal }) => api<InvitationRecord[] | { data: InvitationRecord[] }>(`estates/${encodeURIComponent(estate)}/onboarding/invitations`, { signal }), enabled: !!estate && !preview });
  const create = useMutation({
    mutationFn: ({ path, body }: { path: string; body: Record<string, string> }) => api<CreatedInvitation>(`estates/${encodeURIComponent(estate)}/onboarding/${path}`, { method: "POST", body }),
    onSuccess: async (result) => { setCreated(result); setCopied(false); await client.invalidateQueries({ queryKey: key }); },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api(`estates/${encodeURIComponent(estate)}/onboarding/invitations/${encodeURIComponent(id)}/revoke`, { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (create.isPending) return;
    setValidation(null); setCreated(null);
    const form = new FormData(event.currentTarget);
    if (!estate) return setValidation(new Error("Enter an estate ID."));
    try { create.mutate(adminInvitationRequest(kind, { email: String(form.get("email") || ""), unitId: String(form.get("unitId") || ""), residencyType: String(form.get("residencyType") || ""), role: String(form.get("role") || "") }, activeWorkspace)); }
    catch (error) { setValidation(error instanceof Error ? error : new Error("Check the invitation details.")); }
  }

  async function copyLink(token: string) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/onboarding/invitations/${encodeURIComponent(token)}`); setCopied(true); }
    catch { setValidation(new Error("Couldn’t copy the link. Try again.")); }
  }

  if (preview) return <PreviewNotice />;
  if (!permissions.resident && !permissions.staff.length) return <Empty title="Onboarding is unavailable">Choose an estate management or eligible organization workspace.</Empty>;
  const knownEstates = [...new Map(workspaces.filter((item) => item.organizationId === activeWorkspace?.organizationId && "estateId" in item).map((item) => ["estateId" in item ? item.estateId : "", item.name])).entries()];
  return <div className="space-y-6">
    <section className="panel">
      <p className="text-xs font-bold uppercase tracking-widest text-accent-foreground">People and places</p>
      <h2 className="mt-2 text-xl font-bold">Invite someone to the estate</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Choose the relationship here. The recipient creates their own credentials or signs in with the invited email.</p>
      {!scopedEstate && <div className="mt-6 max-w-md"><label className="block text-sm font-semibold">Estate ID<input className="field mt-2" value={selectedEstate} onChange={(event) => setSelectedEstate(event.target.value)} required placeholder="Enter the estate ID" /></label>{knownEstates.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{knownEstates.map(([id, name]) => <Button key={id} variant="outline" onPress={() => setSelectedEstate(id)}>{name}</Button>)}</div>}</div>}
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Invitation type">
        {permissions.resident && <Button variant={kind === "resident" ? "default" : "outline"} onPress={() => { setKind("resident"); setCreated(null); }}>Resident</Button>}
        {permissions.staff.length > 0 && <Button variant={kind === "staff" ? "default" : "outline"} onPress={() => { setKind("staff"); setCreated(null); }}>Staff</Button>}
      </div>
      <form onSubmit={submit} className="mt-6 max-w-xl space-y-5">
        <label className="block text-sm font-semibold">Recipient email<input className="field mt-2" name="email" type="email" autoComplete="off" required /></label>
        {kind === "resident" ? <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Unit ID<input className="field mt-2" name="unitId" required autoComplete="off" /></label>
          <label className="block text-sm font-semibold">Residency type<select className="field mt-2" name="residencyType" defaultValue="TENANT">{residencyTypes.map((type) => <option key={type} value={type}>{title(type)}</option>)}</select></label>
        </div> : <label className="block text-sm font-semibold">Staff role<select className="field mt-2" name="role">{permissions.staff.map((role) => <option key={role} value={role}>{title(role)}</option>)}</select></label>}
        <ErrorNotice error={validation || create.error} />
        <Button type="submit" isDisabled={create.isPending || !estate}>{create.isPending ? "Creating invitation…" : "Create invitation"}</Button>
      </form>
      {created && <div role="status" className="mt-5 rounded-xl border border-primary/20 bg-accent p-4 text-sm"><p className="font-semibold">Invitation created.</p>{process.env.NODE_ENV === "development" && created.inviteToken && <div className="mt-3"><p className="text-xs text-muted-foreground">Development link. Share it directly with the invited recipient.</p><Button variant="outline" className="mt-2" onPress={() => copyLink(created.inviteToken!)}><Copy className="size-4" />{copied ? "Copied" : "Copy invitation link"}</Button></div>}</div>}
    </section>
    <section className="panel">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Invitations</h2><p className="mt-1 text-sm text-muted-foreground">Current status for this estate.</p></div><Button variant="outline" size="icon" aria-label="Refresh invitations" onPress={() => list.refetch()} isDisabled={!estate || list.isFetching}><RefreshCw className="size-4" /></Button></div>
      {!estate ? <Empty title="Choose an estate">Enter the estate ID to see its invitations.</Empty> : list.isPending ? <Loading /> : list.error ? <ErrorNotice error={list.error} retry={() => list.refetch()} /> : records(list.data || []).length === 0 ? <Empty title="No invitations yet">New invitations will appear here.</Empty> : <div className="mt-5 divide-y">{records(list.data || []).map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="font-semibold break-all">{item.email}</p><p className="mt-1 text-xs text-muted-foreground">{item.type === "RESIDENT" ? `${title(item.residencyType || "RESIDENT")} · ${item.unit?.name || item.unitId || "Unit unavailable"}` : title(item.role || "STAFF")} · Sent {date(item.createdAt)} · Expires {date(item.expiresAt)}</p></div><div className="flex items-center gap-3"><Status value={item.effectiveStatus || item.status} />{item.effectiveStatus === "PENDING" && <Button variant="outline" isDisabled={revoke.isPending} onPress={() => revoke.mutate(item.id)}>Revoke</Button>}</div></article>)}</div>}
      <ErrorNotice error={revoke.error} />
    </section>
  </div>;
}
