export interface Unit { id: string; name: string; code: string }
export interface Gate { id: string; name: string; code: string; status: "ACTIVE" | "INACTIVE" }
export interface Visitor { firstName: string; lastName: string }
export interface Invitation {
  id: string; estateId: string; visitorFirstName: string; visitorLastName: string; visitorPhone?: string | null; purpose?: string | null;
  validFrom: string; validUntil: string; status: "PENDING" | "ACTIVE" | "CANCELLED" | "COMPLETED" | "EXPIRED";
  visitStatus: "NOT_ARRIVED" | "CHECKED_IN" | "CHECKED_OUT"; checkedInAt: string | null; checkedOutAt: string | null;
  hostResidency: { id: string; unit: Unit }; createdAt: string; updatedAt: string;
}
export interface Pass { code: string; token?: string; status: string; effectiveStatus?: string; validFrom: string; validUntil: string }
export interface OnsiteVisitor { visitor: Visitor; host: { unit: Unit }; checkedInAt: string; entryGate: Gate; invitationId: string; purpose?: string | null }
export interface AccessEvent { id: string; type: "CHECK_IN" | "CHECK_OUT"; createdAt: string; visitor: Visitor; host: { unit: Unit }; gate: Gate; performedBy: { id: string; firstName?: string | null; lastName?: string | null } }
export interface Activity { data: AccessEvent[]; meta: { page: number; limit: number; total: number; totalPages: number } }
export type StaffVisitorStatus = "expected" | "onsite" | "departed";
export interface StaffVisitor {
  invitationId: string;
  visitor: Visitor;
  hostUnit: Unit;
  purpose?: string | null;
  validFrom: string;
  validUntil: string;
  status: StaffVisitorStatus;
  checkedInAt: string | null;
  checkedOutAt: string | null;
}
export interface StaffVisitorList { data: StaffVisitor[]; meta: { page: number; limit: number; total: number; totalPages: number } }
export type Verification = { valid: false; status: string } | { valid: true; status: "VALID"; visitor: Visitor; host: { unit: Unit }; invitation: { purpose?: string | null; validFrom: string; validUntil: string } };
export type VisitResult = { success: false; status: string } | { success: true; status: "CHECKED_IN" | "CHECKED_OUT"; visitor: Visitor; host: { unit: Unit } };
