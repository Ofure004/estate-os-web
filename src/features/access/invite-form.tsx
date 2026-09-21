"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { queryKeys, useScope } from "./queries";
import { ErrorNotice, PreviewNotice } from "./ui";
import type { Invitation } from "./types";
export function InviteForm() {
  const { base, estate, userId, workspaces, preview, href } = useScope(); const router = useRouter(); const client = useQueryClient();
  const [hostRequired, setHostRequired] = useState(false); const [validation, setValidation] = useState<Error | null>(null);
  const mutation = useMutation({ mutationFn: (body: Record<string, string>) => api<Invitation>(`${base}/visitor-invitations`, { method: "POST", body }), onSuccess: async (invitation) => { await client.invalidateQueries({ queryKey: queryKeys.invitations(userId, estate) }); router.push(href(`/visitors/${invitation.id}`)); }, onError: (error) => { if (error instanceof ApiError && error.code === "HOST_RESIDENCY_REQUIRED") setHostRequired(true); } });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (mutation.isPending) return; setValidation(null);
    const form = new FormData(event.currentTarget); const body = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value).trim()]));
    const start = new Date(body.validFrom); const end = new Date(body.validUntil);
    if (!body.visitorFirstName || !body.visitorLastName) return setValidation(new Error("Enter the visitor’s first and last name."));
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end || end.getTime() <= Date.now()) return setValidation(new Error("Choose a valid visit window that ends in the future, after its start."));
    body.validFrom = start.toISOString(); body.validUntil = end.toISOString();
    for (const key of ["visitorPhone", "purpose", "hostResidencyId"]) if (!body[key]) delete body[key];
    mutation.mutate(body);
  }
  if (preview) return <PreviewNotice />;
  return <div className="max-w-2xl"><Link href={href("/visitors")} className="text-sm font-semibold text-accent-foreground">← My visitors</Link><section className="panel mt-5"><h2 className="text-xl font-bold">Make them feel expected.</h2><p className="mt-2 text-sm text-muted-foreground">Create a personal access pass for your visitor.</p><form onSubmit={submit} className="mt-7 space-y-5"><fieldset disabled={mutation.isPending} className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">First name<input name="visitorFirstName" className="field mt-2" required maxLength={100} autoComplete="off" /></label><label className="text-sm font-semibold">Last name<input name="visitorLastName" className="field mt-2" required maxLength={100} autoComplete="off" /></label></div><label className="block text-sm font-semibold">Phone <span className="font-normal text-muted-foreground">(optional)</span><input name="visitorPhone" type="tel" maxLength={50} className="field mt-2" /></label><label className="block text-sm font-semibold">Purpose <span className="font-normal text-muted-foreground">(optional)</span><textarea name="purpose" maxLength={1000} rows={3} className="field mt-2" placeholder="A family visit, a delivery, a helping hand…" /></label><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">Valid from<input name="validFrom" type="datetime-local" required className="field mt-2" /></label><label className="text-sm font-semibold">Valid until<input name="validUntil" type="datetime-local" required className="field mt-2" /></label></div><p className="text-xs text-muted-foreground">Times use your device’s local timezone.</p>{hostRequired && <label className="block text-sm font-semibold">Hosting unit<select name="hostResidencyId" required defaultValue="" className="field mt-2"><option value="" disabled>Choose your unit</option>{workspaces.filter((w) => w.type === "resident" && w.estateId === estate).map((w) => <option key={w.id} value={w.type === "resident" ? w.residencyId : ""}>{w.label}</option>)}</select></label>}</fieldset><ErrorNotice error={validation || mutation.error} /><Button type="submit" isDisabled={mutation.isPending} className="h-11 px-5">{mutation.isPending ? "Creating invitation…" : "Create invitation"}</Button></form></section></div>;
}
