import type { Invitation } from "./types";

export function invitationBadgeValues(invitation: Pick<Invitation, "visitStatus" | "status">) {
  return [invitation.visitStatus, invitation.status] as const;
}
