"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
} from "react-aria-components";
import { Plus, ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { queryKeys, useScope } from "./queries";
import { InviteForm } from "./invite-form";
import type { Invitation } from "./types";
import { date, Empty, ErrorNotice, InvitationBadges, Loading, PreviewNotice } from "./ui";
export function Visitors() {
  const { base, estate, userId, enabled, preview, href } = useScope();
  const query = useQuery({
    queryKey: queryKeys.invitations(userId, estate),
    queryFn: ({ signal }) =>
      api<Invitation[]>(`${base}/visitor-invitations`, { signal }),
    enabled,
    refetchInterval: 15_000,
  });
  if (preview) return <PreviewNotice />;
  return (
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">My visitors</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite someone over. We’ll take care of their arrival.
          </p>
        </div>
        <DialogTrigger>
          <Button className="h-11 gap-2 px-4 font-bold">
            <Plus className="size-4" />
            Invite visitor
          </Button>
          <ModalOverlay
            isDismissable
            className="fixed inset-0 z-50 flex min-h-full items-center justify-center overflow-y-auto bg-foreground/35 p-4 backdrop-blur-[3px]"
          >
            <Modal className="w-full max-w-2xl">
              <Dialog
                aria-label="Invite visitor"
                className="relative outline-none"
              >
                <Button
                  slot="close"
                  variant="ghost"
                  size="icon"
                  aria-label="Close invitation form"
                  className="absolute right-5 top-5 z-10 rounded-full"
                >
                  <X className="size-4" />
                </Button>
                <InviteForm />
              </Dialog>
            </Modal>
          </ModalOverlay>
        </DialogTrigger>
      </div>
      <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      {query.isPending ? (
        <Loading />
      ) : query.data?.length === 0 ? (
        <Empty title="Your first welcome starts here">
          Create an invitation to get a visitor’s access pass.
        </Empty>
      ) : (
        <div className="mt-6 divide-y">
          {query.data?.map((visitor) => (
            <Link
              key={visitor.id}
              href={href(`/visitors/${visitor.id}`)}
              className="flex flex-wrap items-center justify-between gap-4 py-5 hover:bg-muted/40"
            >
              <div>
                <p className="font-bold">
                  {visitor.visitorFirstName} {visitor.visitorLastName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {visitor.hostResidency.unit.code} · {date(visitor.validFrom)}{" "}
                  — {date(visitor.validUntil)}
                </p>
              </div>
              <span className="flex items-center gap-4">
                <InvitationBadges visitStatus={visitor.visitStatus} status={visitor.status} />
                <ArrowUpRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
