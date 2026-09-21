import type { NavigationItem } from "./navigation";

export function PageHeader({ screen, children }: { screen: NavigationItem; children?: React.ReactNode }) {
  return (
    <header className="flex min-h-[82px] items-center gap-4 border-b bg-card px-5 py-4 sm:px-7">
      {children}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-extrabold tracking-[-0.035em]">{screen.label}</h1>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{screen.subtitle}</p>
      </div>
      <span className="hidden rounded-lg border bg-sidebar px-3 py-2 text-[11px] font-semibold text-secondary-foreground lg:block">Access Management</span>
    </header>
  );
}
