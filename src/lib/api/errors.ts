export const businessMessages: Record<string, string> = {
  HOST_RESIDENCY_REQUIRED: "Choose the unit you’re hosting this visitor from.",
  ALREADY_CHECKED_IN: "This visitor is already checked in.", NOT_CHECKED_IN: "There is no open visit to check out.",
  INVALID_CREDENTIAL: "This code or QR credential isn’t recognized.", NOT_YET_VALID: "This pass is not valid yet.",
  EXPIRED: "This pass has expired.", REVOKED: "This pass is no longer valid.", CANCELLED: "This invitation was cancelled.",
  COMPLETED: "This visit is complete.", USED: "This pass has already been used.", WRONG_ESTATE: "This pass belongs to another estate.",
  INACTIVE_GATE: "This gate is inactive. Choose an active gate.",
  INVITATION_NOT_FOUND: "This invitation link is invalid or no longer available.",
  INVITATION_EXPIRED: "This invitation has expired. Ask the estate team for a new one.",
  INVITATION_REVOKED: "This invitation was revoked. Contact the estate team.",
  INVITATION_ALREADY_ACCEPTED: "This invitation has already been accepted.",
  INVITATION_ALREADY_PENDING: "An invitation for this relationship is already pending.",
  INVITATION_EMAIL_MISMATCH: "Sign in with the email address on this invitation to continue.",
  RELATIONSHIP_ALREADY_EXISTS: "This person already has the assigned relationship.",
  UNIT_NOT_IN_ESTATE: "This unit does not belong to the selected estate.",
  ROLE_NOT_ASSIGNABLE: "Your role cannot assign this staff role.",
};
export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) { super(message); this.name = "ApiError"; }
}
export function normalizeError(status: number, body: unknown): ApiError {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const code = typeof value.code === "string" ? value.code : undefined;
  const message = Array.isArray(value.message) ? value.message.filter((v) => typeof v === "string").join(". ") : value.message;
  return new ApiError(status, (code && businessMessages[code]) || (status === 401 ? "Your session has ended. Please sign in again." : status === 403 ? "You don’t have permission to perform this action." : status >= 500 ? "We couldn’t reach the service. Please try again." : typeof message === "string" ? message : status === 404 ? "This item is no longer available. Refresh and try again." : status === 409 ? "This visit changed. Refresh and try again." : "The request could not be completed."), code);
}

/** Gate endpoints can reject a business action while returning HTTP 200. */
export function requireSuccessfulResult<T extends { status: string; valid?: boolean; success?: boolean }>(result: T): T {
  if (result.valid === false || result.success === false)
    throw new ApiError(422, businessMessages[result.status] || "This action could not be completed.", result.status);
  return result;
}
