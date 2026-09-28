"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Menu, ShieldCheck, X } from "lucide-react";
import { Dialog, DialogTrigger, Heading, Modal, ModalOverlay } from "react-aria-components";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/features/auth/workspace-provider";
import { WorkspaceEntry } from "@/features/auth/workspace-entry";
import { AppSidebar } from "./app-sidebar";
import { getNavigation, getScreen, navigation } from "./navigation";
import { PageHeader } from "./page-header";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { activeWorkspace, preview, href } = useWorkspace();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!activeWorkspace) return <WorkspaceEntry />;
  const screen = getScreen(pathname) ?? navigation[0];
  const allowed = getNavigation(activeWorkspace).some((item) => item.id === screen.id);
  const nestedPageLabel = pathname === `${screen.href}/new`
    ? "Invite visitor"
    : pathname.startsWith(`${screen.href}/`)
      ? screen.id === "visitors" ? "Visitor details" : "Details"
      : null;

  return (
    <div data-collapsed={collapsed} className="min-h-dvh">
      <a href="#main-content" className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-foreground px-4 py-3 text-sm text-card focus:translate-y-0">Skip to content</a>
      <aside className="sidebar-width fixed inset-y-0 left-0 z-30 hidden border-r bg-sidebar transition-[width] duration-200 md:block">
        <AppSidebar pathname={pathname} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </aside>
      <div className="shell-content flex min-h-dvh flex-col transition-[padding] duration-200">
        {preview && <div className="flex flex-wrap items-center justify-between gap-1 border-b border-warning/15 bg-warning-muted px-5 py-2 text-[10px] font-medium text-warning sm:px-7"><span>Shell preview · Sample workspace</span><span>Connect a backend to use access management</span></div>}
        <PageHeader screen={screen}>
          <DialogTrigger isOpen={mobileOpen} onOpenChange={setMobileOpen}>
            <Button variant="outline" size="icon" aria-label="Open navigation" className="size-10 shrink-0 md:hidden"><Menu className="size-5" /></Button>
            <ModalOverlay isDismissable className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px]">
              <Modal className="h-dvh w-[min(19rem,calc(100vw-3rem))] bg-sidebar shadow-xl">
                <Dialog className="relative h-full outline-none">
                  <Heading slot="title" className="sr-only">Navigation</Heading>
                  <Button slot="close" variant="ghost" size="icon" aria-label="Close navigation" className="absolute right-3 top-5"><X className="size-4" /></Button>
                  <AppSidebar pathname={pathname} onNavigate={() => setMobileOpen(false)} />
                </Dialog>
              </Modal>
            </ModalOverlay>
          </DialogTrigger>
        </PageHeader>
        <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-5 py-6 outline-none sm:px-7 sm:py-7">
          <nav className="mb-6 min-w-0 text-[11px] text-muted-foreground" aria-label="Breadcrumb">
            <ol className="flex min-w-0 items-center gap-2">
              <li className="min-w-0">
                <Link href={href("/overview")} className="block truncate rounded-sm transition-colors hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                  {activeWorkspace.name}
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight className="size-3 shrink-0" /></li>
              <li className="shrink-0 font-medium text-secondary-foreground">
                {!nestedPageLabel
                  ? <span aria-current="page">{screen.label}</span>
                  : <Link href={href(screen.href)} className="rounded-sm transition-colors hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">{screen.label}</Link>}
              </li>
              {nestedPageLabel && <>
                <li aria-hidden="true"><ChevronRight className="size-3 shrink-0" /></li>
                <li className="truncate font-medium text-secondary-foreground" aria-current="page">{nestedPageLabel}</li>
              </>}
            </ol>
          </nav>
          <div key={activeWorkspace.id} className="flex-1">
            {allowed ? children : <section className="rounded-2xl border bg-card p-8"><h2 className="text-lg font-bold">This page isn’t available in this workspace</h2><p className="mt-2 text-sm text-muted-foreground">Choose another workspace or return to your overview.</p><Link href={href("/overview")} className="mt-5 inline-block text-sm font-semibold text-accent-foreground underline underline-offset-4">Go to overview</Link></section>}
          </div>
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground"><span>EstateOS · A well-managed community.</span><span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" aria-hidden="true" />{activeWorkspace.label} workspace</span></footer>
        </main>
      </div>
    </div>
  );
}
