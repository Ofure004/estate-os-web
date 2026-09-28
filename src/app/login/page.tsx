"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { EstateBrand } from "@/components/layout/estate-brand";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { pendingInvitationKey, safeLoginNext } from "@/features/onboarding/model";

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await api("auth/login", {
        method: "POST",
        body: {
          email: String(form.get("email")).trim(),
          password: form.get("password"),
        },
      });
      const pendingInvitation = sessionStorage.getItem(pendingInvitationKey);
      sessionStorage.removeItem(pendingInvitationKey);
      router.replace(safeLoginNext(pendingInvitation));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <EstateBrand className="mb-10" />
      <section className="rounded-2xl border bg-card p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-accent-foreground">Welcome home</p>
        <h1 className="mt-3 text-2xl font-bold">Sign in to EstateOS</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your community, connected.</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold">
            Email
            <input className="field mt-2" name="email" type="email" autoComplete="username" required />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <span className="relative mt-2 block">
              <input
                className="field pr-12"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onPress={() => setShowPassword((visible) => !visible)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </span>
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" isDisabled={pending} className="h-11 w-full">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}
