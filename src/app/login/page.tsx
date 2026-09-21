"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EstateBrand } from "@/components/layout/estate-brand";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const form = new FormData(event.currentTarget); setPending(true); setError("");
    try { await api("auth/login", { method: "POST", body: { email: String(form.get("email")).trim(), password: form.get("password") } }); router.replace("/overview"); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in."); setPending(false); }
  }
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12"><EstateBrand className="mb-10" /><section className="rounded-2xl border bg-card p-8"><p className="text-xs font-bold uppercase tracking-widest text-accent-foreground">Welcome home</p><h1 className="mt-3 text-2xl font-bold">Sign in to EstateOS</h1><p className="mt-2 text-sm text-muted-foreground">Your community, connected.</p><form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-sm font-semibold">Email<input className="field mt-2" name="email" type="email" autoComplete="username" required /></label><label className="block text-sm font-semibold">Password<input className="field mt-2" name="password" type="password" autoComplete="current-password" required /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" isDisabled={pending} className="h-11 w-full">{pending ? "Signing in…" : "Sign in"}</Button></form></section></main>;
}
