import { VisitorDetail } from "@/features/access/visitor-detail";
export default async function Page({ params }: { params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params;
  return <VisitorDetail id={invitationId} />;
}
