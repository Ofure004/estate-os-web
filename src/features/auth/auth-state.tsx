"use client";

import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { EstateBrand } from "@/components/layout/estate-brand";
import { Button } from "@/components/ui/button";
import { signOut } from "./actions";
import type { DashboardContext } from "./server";

const messages = {
  unconfigured: { title: "Your workspace is being connected", description: "EstateOS is being prepared for your community. Please check back soon." },
  unauthenticated: { title: "Sign in to your workspace", description: "You need an active session to open EstateOS. Please sign in to continue." },
  unavailable: { title: "We couldn’t load your workspace", description: "There was a problem connecting to your account. Please try again." },
  "context-unavailable": { title: "Your workspace isn’t available yet", description: "Your account is recognized, but workspace access isn’t available yet. Please contact your estate administrator." },
};

export function AuthState({ status }: { status: Exclude<DashboardContext["status"], "ready"> }) {
  const router = useRouter();
  const message = messages[status];
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
    <EstateBrand className="mb-10" />
    <div className="rounded-2xl border bg-card p-7">
      <LockKeyhole className="mb-5 size-7 text-accent-foreground" aria-hidden="true" />
      <h1 className="text-xl font-bold tracking-tight">{message.title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{message.description}</p>
      {(status === "unavailable" || status === "context-unavailable") && <Button onPress={() => router.refresh()} variant="secondary" className="mt-5">Try again</Button>}
      {status === "context-unavailable" && <form action={signOut} className="mt-3"><Button type="submit" variant="ghost">Sign out</Button></form>}
    </div>
  </main>;
}
