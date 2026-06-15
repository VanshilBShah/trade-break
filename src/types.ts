// ---------------------------------------------------------------------------
// Core data models for the Trade Break Resolution Console.
// ---------------------------------------------------------------------------

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export type BreakStatus =
  | 'New'
  | 'In Progress'
  | 'Escalated'
  | 'Resolved'
  | 'Reopened';

export type BreakType =
  | 'Quantity Mismatch'
  | 'Price Break'
  | 'Settlement Date Mismatch'
  | 'Missing Confirmation'
  | 'Counterparty Static Data Mismatch'
  | 'SSI Mismatch';

export type ResolutionAction = 'Resolve' | 'Escalate' | 'Reassign' | 'Reopen';

export type UserRole = 'Ops Analyst' | 'Senior Ops / Compliance';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  initials: string;
}

/**
 * Reason codes shown in the resolution action panel. In a real system these
 * would come from a controlled reference-data list maintained by Compliance;
 * here they're hardcoded per action type to keep the mock data self-contained.
 */
export const REASON_CODES: Record<ResolutionAction, string[]> = {
  Resolve: [
    'Counterparty confirmed correct terms',
    'Internal booking error corrected',
    'Late confirmation received and matched',
    'Duplicate break — resolved as one',
    'Static data corrected in SSI database',
  ],
  Escalate: [
    'Counterparty unresponsive beyond SLA',
    'Value exceeds analyst approval threshold',
    'Suspected fraud / irregular activity',
    'Cross-desk dependency requires sign-off',
  ],
  Reassign: [
    'Requires desk with product expertise',
    'Original assignee out of office',
    'Workload rebalancing',
  ],
  Reopen: [
    'Counterparty disputed resolution',
    'Settlement failed after marked resolved',
    'Incorrect reason code used previously',
  ],
};

export interface AuditEntry {
  id: string;
  timestamp: string; // ISO 8601
  actor: string;
  action: ResolutionAction | 'Created' | 'Comment';
  reasonCode?: string;
  note?: string;
  fromStatus?: BreakStatus;
  toStatus?: BreakStatus;
}

/**
 * Trade data can be partially missing when upstream systems fail to send a
 * complete record — modeled explicitly rather than assuming every field is
 * always present. See edge case #1 in CASE_STUDY.md.
 */
export interface TradeData {
  tradeRef: string;
  product: string;
  buySell: 'Buy' | 'Sell';
  quantity: number | null;
  price: number | null;
  currency: string;
  tradeDate: string; // ISO date
  settlementDate: string | null;
  counterparty: string;
  counterpartyLEI: string | null;
  trader: string;
  book: string;
  isPartial: boolean; // true when one or more fields above are unavailable
}

export interface CounterpartyHistory {
  totalBreaksLast90Days: number;
  avgResolutionTimeHours: number;
  lastBreakDate: string | null;
  notes?: string;
}

export interface TradeBreak {
  id: string; // Break ID, e.g. "BRK-10234"
  tradeRef: string;
  counterparty: string;
  breakType: BreakType;
  severity: Severity;
  status: BreakStatus;
  ageHours: number;
  assignedTo: string | null; // User id, or null if unassigned
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  trade: TradeData;
  counterpartyHistory: CounterpartyHistory;
  auditTrail: AuditEntry[];
  /**
   * When true, the current viewer's role does not have permission to act on
   * this break regardless of status — used to demonstrate edge case #2.
   * In this simulation, restricted breaks are those above a value threshold
   * or flagged for Compliance-only handling.
   */
  requiresSeniorApproval: boolean;
}
