"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api/client";
import { queryKeys, useScope } from "./queries";
import type { Invitation } from "./types";
import { date, Empty, ErrorNotice, Loading, PreviewNotice, Status } from "./ui";
export function Visitors() {
  const { base, estate, userId, enabled, preview, href } = useScope();
  const query = useQuery({ queryKey: queryKeys.invitations(userId, estate), queryFn: ({ signal }) => api<Invitation[]>(`${base}/visitor-invitations`, { signal }), enabled });
  if (preview) return <PreviewNotice />;
  return <section className="panel"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">My visitors</h2><p className="mt-1 text-sm text-muted-foreground">Invite someone over. We’ll take care of their arrival.</p></div><Link href={href("/visitors/new")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><Plus className="size-4" />Invite visitor</Link></div><ErrorNotice error={query.error} retry={() => void query.refetch()} />{query.isPending ? <Loading /> : query.data?.length === 0 ? <Empty title="Your first welcome starts here">Create an invitation to get a visitor’s access pass.</Empty> : <div className="mt-6 divide-y">{query.data?.map((visitor) => <Link key={visitor.id} href={href(`/visitors/${visitor.id}`)} className="flex flex-wrap items-center justify-between gap-4 py-5 hover:bg-muted/40"><div><p className="font-bold">{visitor.visitorFirstName} {visitor.visitorLastName}</p><p className="mt-1 text-sm text-muted-foreground">{visitor.hostResidency.unit.code} · {date(visitor.validFrom)} — {date(visitor.validUntil)}</p></div><span className="flex items-center gap-4"><Status value={visitor.status} /><ArrowUpRight className="size-4" /></span></Link>)}</div>}</section>;
}
