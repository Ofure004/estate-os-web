import type { Metadata } from "next";
import { RecipientInvitation } from "@/features/onboarding/recipient";

export const metadata: Metadata = { title: "Accept invitation", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RecipientInvitation token={token} />;
}
