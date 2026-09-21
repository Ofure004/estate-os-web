"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
export function ErrorNotice({ error, retry }: { error: Error | null; retry?: () => void }) {
  if (!error) return null;
  return <div role="alert" className="my-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm"><p>{error.message}</p>{error instanceof ApiError && error.statusCode === 401 ? <Link href="/login" className="mt-2 inline-block font-bold underline">Sign in again</Link> : retry && <Button variant="outline" className="mt-3" onPress={retry}>Try again</Button>}</div>;
}
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) { return <div className="py-12 text-center"><h3 className="font-bold">{title}</h3><div className="mt-2 text-sm text-muted-foreground">{children}</div></div>; }
export function Loading() { return <p role="status" className="py-10 text-sm text-muted-foreground">Loading…</p>; }
export function date(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "Unavailable" : d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); }
export function Status({ value }: { value: string }) { return <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{value.toLowerCase().replaceAll("_", " ")}</span>; }
export function PreviewNotice() { return <Empty title="Connect your estate to get started">Live access information will appear when the backend is connected.</Empty>; }
