import { EstateBrand } from "@/components/layout/estate-brand";

export default function Loading() {
  return <div className="min-h-dvh bg-background p-6" role="status" aria-label="Loading workspace">
    <EstateBrand />
    <div className="mx-auto mt-16 max-w-5xl motion-safe:animate-pulse" aria-hidden="true">
      <div className="h-7 w-40 rounded-lg bg-muted" /><div className="mt-3 h-4 w-64 max-w-full rounded bg-muted" />
      <div className="mt-8 h-96 rounded-2xl border bg-card" />
    </div>
    <span className="sr-only">Loading your workspace…</span>
  </div>;
}
