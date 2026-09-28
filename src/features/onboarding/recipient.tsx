"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EstateBrand } from "@/components/layout/estate-brand";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { date, ErrorNotice, Loading, Status } from "@/features/access/ui";
import { acceptanceBody, invitationPath, pendingInvitationKey, recipientAccess, relationshipFields, type AcceptedInvitation, type InvitationDetails } from "./model";

export function RecipientInvitation({ token }: { token: string }) {
  const router = useRouter();
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [account, setAccount] = useState<{ email: string } | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);
  const [acceptError, setAcceptError] = useState<Error | null>(null);
  const [success, setSuccess] = useState<AcceptedInvitation | null>(null);
  const path = `onboarding/invitations/${encodeURIComponent(token)}`;

  useEffect(() => {
    const controller = new AbortController();
    api<InvitationDetails>(path, { signal: controller.signal, redirectOnUnauthorized: false })
      .then((value) => { setDetails(value); setLoadError(null); })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error : new Error("Unable to load invitation.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path]);

  useEffect(() => {
    if (!details?.existingUser) return;
    sessionStorage.setItem(pendingInvitationKey, invitationPath(token));
    const controller = new AbortController();
    api<{ email: string }>("auth/me", { signal: controller.signal, redirectOnUnauthorized: false })
      .then((value) => { setAccount(value); setAccountError(null); })
      .catch((error) => { if (!controller.signal.aborted && !(error && typeof error === "object" && "statusCode" in error && error.statusCode === 401)) setAccountError(error instanceof Error ? error : new Error("Unable to check your account.")); })
      .finally(() => { if (!controller.signal.aborted) setAccountLoading(false); });
    return () => controller.abort();
  }, [details, token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details || pending || success) return;
    setAcceptError(null);
    if (details.existingUser && recipientAccess(details, account) !== "ready") return;
    let body: ReturnType<typeof acceptanceBody>;
    try {
      const form = new FormData(event.currentTarget);
      body = acceptanceBody(details, details.existingUser ? undefined : { firstName: String(form.get("firstName") || ""), lastName: String(form.get("lastName") || ""), password: String(form.get("password") || "") });
    } catch (error) { setAcceptError(error instanceof Error ? error : new Error("Check your details.")); return; }
    setPending(true);
    try {
      const result = await api<AcceptedInvitation>(`${path}/accept`, { method: "POST", body, redirectOnUnauthorized: false });
      setSuccess(result);
      if (details.existingUser) { sessionStorage.removeItem(pendingInvitationKey); router.refresh(); }
    } catch (error) { setAcceptError(error instanceof Error ? error : new Error("Unable to accept invitation.")); }
    finally { setPending(false); }
  }

  return <main className="mx-auto min-h-dvh max-w-2xl px-5 py-12 sm:py-20">
    <EstateBrand className="mb-10" />
    <section className="panel">
      <p className="text-xs font-bold uppercase tracking-widest text-accent-foreground">Estate invitation</p>
      <h1 className="mt-3 text-2xl font-bold">Your place in the community</h1>
      {loading ? <Loading /> : loadError ? <ErrorNotice error={loadError} /> : details && <>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Review the relationship assigned by the estate team before accepting.</p>
        <dl className="mt-7 grid gap-4 rounded-xl border bg-muted/30 p-5 sm:grid-cols-2">
          {relationshipFields(details).map((field) => <div key={field.label}><dt className="text-xs text-muted-foreground">{field.label}</dt><dd className="mt-1 break-words font-semibold">{field.value}</dd></div>)}
          <div><dt className="text-xs text-muted-foreground">Expires</dt><dd className="mt-1 font-semibold">{date(details.expiresAt)}</dd></div>
        </dl>
        {success ? <div role="status" className="mt-7 space-y-4"><Status value="ACCEPTED" /><p className="text-sm">Your invitation was accepted.</p><Link className="inline-block text-sm font-bold text-accent-foreground underline" href={details.existingUser ? "/overview" : "/login"}>{details.existingUser ? "Open your workspace" : "Sign in to your new account"}</Link></div>
          : details.existingUser ? <div className="mt-7"><h2 className="font-bold">Accept with your existing account</h2><p className="mt-2 text-sm text-muted-foreground">Sign in as {details.email} to accept this invitation.</p>{accountLoading ? <Loading /> : accountError ? <ErrorNotice error={accountError} /> : recipientAccess(details, account) === "wrong-account" ? <div role="alert" className="mt-4 rounded-xl border border-warning/30 bg-warning-muted p-4 text-sm">You’re signed in as {account?.email}. Switch to {details.email} before accepting. Your current account cannot accept this invitation.<div className="mt-3"><Link className="font-bold underline" href="/login">Switch accounts</Link></div></div> : recipientAccess(details, account) === "login" ? <Link className="mt-4 inline-block text-sm font-bold text-accent-foreground underline" href="/login">Sign in to accept</Link> : <form className="mt-5" onSubmit={submit}>{acceptError instanceof ApiError && acceptError.statusCode === 401 ? <div role="alert" className="my-4 text-sm">Your session has ended. <Link className="font-bold underline" href="/login">Sign in to continue</Link>.</div> : <ErrorNotice error={acceptError} />}<Button type="submit" isDisabled={pending}>{pending ? "Accepting…" : "Accept invitation"}</Button></form>}</div>
          : <form onSubmit={submit} className="mt-7 space-y-5"><h2 className="font-bold">Create your account</h2><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">First name<input name="firstName" className="field mt-2" required maxLength={100} autoComplete="given-name" /></label><label className="text-sm font-semibold">Last name<input name="lastName" className="field mt-2" required maxLength={100} autoComplete="family-name" /></label></div><label className="block text-sm font-semibold">Password<input name="password" className="field mt-2" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /><span className="mt-1 block text-xs font-normal text-muted-foreground">12–128 characters</span></label><ErrorNotice error={acceptError} /><Button type="submit" isDisabled={pending}>{pending ? "Accepting…" : "Create account and accept"}</Button></form>}
      </>}
    </section>
  </main>;
}
