"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { requireSuccessfulResult } from "@/lib/api/errors";
import { queryKeys, useRefreshAccess, useScope } from "./queries";
import type { Gate, StaffVisitor, StaffVisitorList, StaffVisitorStatus, Verification, VisitResult } from "./types";
import { date, Empty, ErrorNotice, Loading, PreviewNotice } from "./ui";

type Filter = "all" | StaffVisitorStatus;
type GateAction = { visitor: StaffVisitor; mode: "entry" | "exit" };

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "expected", label: "Expected" },
  { id: "onsite", label: "On-site" },
  { id: "departed", label: "Departed" },
];

function StaffStatus({ value }: { value: StaffVisitorStatus }) {
  const styles = {
    expected: "bg-warning-muted text-warning",
    onsite: "bg-accent text-accent-foreground",
    departed: "bg-muted text-muted-foreground",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value]}`}>{value === "onsite" ? "On-site" : value[0].toUpperCase() + value.slice(1)}</span>;
}

export function StaffVisitors() {
  const { base, estate, userId, enabled, preview, activeWorkspace } = useScope();
  const refreshAccess = useRefreshAccess();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<GateAction | null>(null);
  const [gate, setGate] = useState("");
  const [credential, setCredential] = useState("");
  const [verified, setVerified] = useState<Extract<Verification, { valid: true }> | null>(null);
  const [notice, setNotice] = useState("");
  const canOperate = activeWorkspace?.type === "guard" || activeWorkspace?.type === "security";
  const queryString = new URLSearchParams({
    ...(filter === "all" ? {} : { status: filter }),
    page: String(page),
    limit: "20",
  }).toString();
  const visitors = useQuery({
    queryKey: queryKeys.staffVisitorList(userId, estate, filter, page),
    queryFn: ({ signal }) => api<StaffVisitorList>(`${base}/access/visitors?${queryString}`, { signal }),
    enabled,
    refetchInterval: 15_000,
  });
  const gates = useQuery({
    queryKey: queryKeys.gates(userId, estate),
    queryFn: ({ signal }) => api<Gate[]>(`${base}/gates`, { signal }),
    enabled: enabled && canOperate,
  });
  const activeGates = gates.data?.filter((item) => item.status === "ACTIVE") ?? [];
  const gateId = gate || (activeGates.length === 1 ? activeGates[0].id : "");

  const action = useMutation({
    mutationFn: async (operation: "verify" | "check-in" | "check-out") => {
      if (!gateId || !credential.trim()) throw new Error("Choose a gate and enter the visitor’s credential.");
      const result = await api<Verification | VisitResult>(`${base}/gates/${encodeURIComponent(gateId)}/access/${operation}`, {
        method: "POST",
        body: { credential: credential.trim() },
      });
      return requireSuccessfulResult(result);
    },
    onSuccess: async (result) => {
      if ("valid" in result && result.valid) {
        setVerified(result);
        return;
      }
      if ("success" in result && result.success) {
        setNotice(`${result.visitor.firstName} ${result.visitor.lastName} ${result.status === "CHECKED_IN" ? "checked in" : "checked out"}.`);
        setSelected(null);
        setVerified(null);
        setCredential("");
        await refreshAccess();
      }
    },
    onError: () => setVerified(null),
  });

  function openAction(visitor: StaffVisitor) {
    action.reset();
    setCredential("");
    setVerified(null);
    setNotice("");
    setSelected({ visitor, mode: visitor.status === "onsite" ? "exit" : "entry" });
  }

  function closeAction() {
    setSelected(null);
    setCredential("");
    setVerified(null);
    action.reset();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || action.isPending) return;
    action.mutate(selected.mode === "entry" ? "verify" : "check-out");
  }

  if (preview) return <PreviewNotice />;
  const meta = visitors.data?.meta;

  return (
    <section className="panel overflow-hidden p-0 sm:p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-7">
        <div>
          <h2 className="text-xl font-bold">Visitor management</h2>
          <p className="mt-1 text-sm text-muted-foreground">Expected, on-site, and departed visitors across the estate. Times use your device timezone.</p>
        </div>
        <Button variant="outline" isDisabled={visitors.isFetching} onPress={() => void visitors.refetch()}>
          <RefreshCw className={visitors.isFetching ? "animate-spin" : ""} />
          {visitors.isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-y bg-muted/35 px-5 py-2 sm:px-7" aria-label="Filter visitors">
        {filters.map((item) => (
          <Button
            key={item.id}
            variant={filter === item.id ? "default" : "ghost"}
            aria-pressed={filter === item.id}
            onPress={() => { setFilter(item.id); setPage(1); }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {notice && <p role="status" className="mx-5 mt-5 rounded-xl bg-accent p-4 text-sm font-semibold text-accent-foreground sm:mx-7">{notice}</p>}
      <div className="px-5 sm:px-7"><ErrorNotice error={visitors.error} retry={() => void visitors.refetch()} /></div>
      {visitors.isPending ? <div className="px-5 sm:px-7"><Loading /></div> : visitors.data?.data.length === 0 ? (
        <Empty title={`No ${filter === "all" ? "operational" : filter} visitors`}>This list refreshes automatically when gate activity changes.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-7 py-4 font-semibold">Visitor</th>
                <th className="px-4 py-4 font-semibold">Host</th>
                <th className="px-4 py-4 font-semibold">Visit window</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                {canOperate && <th className="px-7 py-4 text-right font-semibold">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {visitors.data?.data.map((visitor) => (
                <tr key={visitor.invitationId} className="transition-colors hover:bg-muted/30">
                  <td className="px-7 py-4">
                    <p className="font-bold">{visitor.visitor.firstName} {visitor.visitor.lastName}</p>
                    <p className="mt-1 max-w-56 truncate text-xs text-muted-foreground">{visitor.purpose || "Visitor"}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold">{visitor.hostUnit.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{visitor.hostUnit.code}</p>
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <p><span className="text-muted-foreground">Valid from </span>{date(visitor.validFrom)}</p>
                    <p className="mt-1"><span className="text-muted-foreground">Until </span>{date(visitor.validUntil)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <StaffStatus value={visitor.status} />
                    {visitor.status === "onsite" && visitor.checkedInAt && <p className="mt-1.5 text-xs text-muted-foreground">In {date(visitor.checkedInAt)}</p>}
                    {visitor.status === "departed" && visitor.checkedOutAt && <p className="mt-1.5 text-xs text-muted-foreground">Out {date(visitor.checkedOutAt)}</p>}
                  </td>
                  {canOperate && <td className="px-7 py-4 text-right">
                    {visitor.status !== "departed" && (
                      <Button variant={visitor.status === "expected" ? "default" : "outline"} onPress={() => openAction(visitor)}>
                        {visitor.status === "expected" ? <ArrowDownToLine /> : <ArrowUpFromLine />}
                        {visitor.status === "expected" ? "Check in" : "Check out"}
                      </Button>
                    )}
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-sm sm:px-7">
          <span className="text-muted-foreground">{meta.total} visitors · Page {meta.page} of {Math.max(1, meta.totalPages)}</span>
          <div className="flex gap-2">
            <Button variant="outline" isDisabled={page <= 1 || visitors.isFetching} onPress={() => setPage((value) => value - 1)}>Previous</Button>
            <Button variant="outline" isDisabled={page >= meta.totalPages || visitors.isFetching} onPress={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      )}

      <ModalOverlay
        isOpen={selected !== null}
        onOpenChange={(open) => { if (!open) closeAction(); }}
        isDismissable
        className="fixed inset-0 z-50 flex min-h-full items-center justify-center overflow-y-auto bg-foreground/35 p-4 backdrop-blur-[3px]"
      >
        <Modal className="w-full max-w-lg">
          <Dialog aria-label={selected?.mode === "entry" ? "Check in visitor" : "Check out visitor"} className="relative rounded-2xl border bg-card p-6 shadow-xl outline-none sm:p-7">
            <Button slot="close" variant="ghost" size="icon" aria-label="Close" className="absolute right-4 top-4 rounded-full"><X /></Button>
            <ScanLine className="size-7 text-accent-foreground" />
            <h3 className="mt-4 text-xl font-bold">{selected?.mode === "entry" ? "Check in a visitor" : "Check out a visitor"}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Scan the visitor’s QR pass or enter its code. The credential determines whose visit is recorded.</p>
            <ErrorNotice error={gates.error} retry={() => void gates.refetch()} />
            {!verified ? (
              <form onSubmit={submit} className="mt-6 space-y-5">
                <label className="block text-sm font-semibold">Operating gate
                  <select className="field mt-2" value={gateId} required disabled={action.isPending || gates.isPending} onChange={(event) => { action.reset(); setGate(event.target.value); }}>
                    <option value="">{gates.isPending ? "Loading gates…" : "Choose a gate"}</option>
                    {activeGates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold">Pass code or scanned credential
                  <input autoFocus className="field mt-2 font-mono" value={credential} onChange={(event) => { action.reset(); setCredential(event.target.value); }} autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={512} disabled={action.isPending} placeholder="Enter code or use a QR scanner" />
                </label>
                {gates.isSuccess && !activeGates.length && <p className="text-sm text-muted-foreground">No active gates are available. Contact an estate administrator.</p>}
                <ErrorNotice error={action.error} />
                <Button type="submit" className="h-11 w-full" isDisabled={action.isPending || !gateId || !credential.trim()}>
                  {action.isPending ? "Please wait…" : selected?.mode === "entry" ? "Verify pass" : "Confirm check-out"}
                </Button>
              </form>
            ) : (
              <div className="mt-6">
                <div className="rounded-xl bg-muted p-4 text-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-success">Pass verified</p>
                  <p className="mt-3 text-lg font-bold">{verified.visitor.firstName} {verified.visitor.lastName}</p>
                  <p className="mt-1 text-muted-foreground">{verified.host.unit.name} · {verified.host.unit.code}</p>
                  <p className="mt-3 text-xs text-muted-foreground">Valid until {date(verified.invitation.validUntil)}</p>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">Confirm the verified visitor and host details before recording entry.</p>
                <ErrorNotice error={action.error} />
                <Button className="mt-5 h-11 w-full" isDisabled={action.isPending} onPress={() => action.mutate("check-in")}>
                  {action.isPending ? "Checking in…" : "Confirm check-in"}
                </Button>
              </div>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </section>
  );
}
