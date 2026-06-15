import type {
  TradeBreak,
  BreakType,
  Severity,
  BreakStatus,
  AuditEntry,
  User,
} from '../types';

export const USERS: User[] = [
  { id: 'u-priya', name: 'Priya Anand', role: 'Ops Analyst', initials: 'PA' },
  { id: 'u-marcus', name: 'Marcus Feld', role: 'Ops Analyst', initials: 'MF' },
  { id: 'u-jin', name: 'Jin Ha-eun', role: 'Ops Analyst', initials: 'JH' },
  {
    id: 'u-oliver',
    name: 'Oliver Grant',
    role: 'Senior Ops / Compliance',
    initials: 'OG',
  },
  {
    id: 'u-sofia',
    name: 'Sofia Delgado',
    role: 'Senior Ops / Compliance',
    initials: 'SD',
  },
];

const COUNTERPARTIES = [
  'Meridian Capital Partners',
  'Northgate Securities',
  'Blackrose Asset Management',
  'Vantage Point Investments',
  'Corriente Global Markets',
  'Halvard & Cross LLP',
  'Ashfield Pension Trust',
  'Ridgeline Credit Partners',
  'Solstice Macro Fund',
  'Iberian Custody Bank',
  'Kestrel Prime Brokerage',
  'Northwind Sovereign Fund',
];

const BREAK_TYPES: BreakType[] = [
  'Quantity Mismatch',
  'Price Break',
  'Settlement Date Mismatch',
  'Missing Confirmation',
  'Counterparty Static Data Mismatch',
  'SSI Mismatch',
];

const PRODUCTS = [
  'UST 10Y Note',
  'EUR/USD FX Fwd',
  'S&P 500 E-mini Future',
  'IG Corporate Bond',
  'Interest Rate Swap 5Y',
  'GBP/JPY FX Spot',
  'Equity Repo',
  'CDS Index Tranche',
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(2024);
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function pickSeverity(): Severity {
  const roll = rand();
  if (roll < 0.15) return 'Critical';
  if (roll < 0.4) return 'High';
  if (roll < 0.75) return 'Medium';
  return 'Low';
}
function isoDaysAgo(days: number, hoursOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hoursOffset);
  return d.toISOString();
}

function buildAuditTrail(
  status: BreakStatus,
  createdAt: string,
  assignee: string | null,
): AuditEntry[] {
  const trail: AuditEntry[] = [
    {
      id: 'ae-created',
      timestamp: createdAt,
      actor: 'System',
      action: 'Created',
      note: 'Break generated from overnight settlement reconciliation run.',
    },
  ];
  if (status === 'In Progress' || status === 'Escalated' || status === 'Resolved' || status === 'Reopened') {
    trail.push({
      id: 'ae-assigned',
      timestamp: createdAt,
      actor: 'System',
      action: 'Comment',
      note: assignee ? `Auto-assigned to ${assignee} based on desk coverage.` : 'Awaiting assignment.',
    });
  }
  if (status === 'Escalated') {
    trail.push({
      id: 'ae-escalated',
      timestamp: createdAt,
      actor: assignee ?? 'Unassigned',
      action: 'Escalate',
      reasonCode: 'Value exceeds analyst approval threshold',
      fromStatus: 'In Progress',
      toStatus: 'Escalated',
    });
  }
  if (status === 'Resolved') {
    trail.push({
      id: 'ae-resolved',
      timestamp: createdAt,
      actor: assignee ?? 'Unassigned',
      action: 'Resolve',
      reasonCode: 'Counterparty confirmed correct terms',
      fromStatus: 'In Progress',
      toStatus: 'Resolved',
    });
  }
  if (status === 'Reopened') {
    trail.push(
      {
        id: 'ae-resolved-first',
        timestamp: createdAt,
        actor: assignee ?? 'Unassigned',
        action: 'Resolve',
        reasonCode: 'Counterparty confirmed correct terms',
        fromStatus: 'In Progress',
        toStatus: 'Resolved',
      },
      {
        id: 'ae-reopened',
        timestamp: createdAt,
        actor: 'Oliver Grant',
        action: 'Reopen',
        reasonCode: 'Settlement failed after marked resolved',
        note: 'Custodian reported settlement fail overnight despite Resolved status. Reopening for re-investigation.',
        fromStatus: 'Resolved',
        toStatus: 'Reopened',
      },
    );
  }
  return trail;
}

const STATUSES: BreakStatus[] = ['New', 'In Progress', 'Escalated', 'Resolved', 'Reopened'];

function buildBreak(
  index: number,
  overrides: Partial<TradeBreak> = {},
): TradeBreak {
  const severity = overrides.severity ?? pickSeverity();
  const status = overrides.status ?? pick(STATUSES);
  const ageHours = overrides.ageHours ?? Math.floor(rand() * 96) + 1;
  const assignee = status === 'New' ? null : pick(USERS).name;
  const createdAt = isoDaysAgo(Math.floor(ageHours / 24), ageHours % 24);
  const counterparty = overrides.counterparty ?? pick(COUNTERPARTIES);
  const quantity = Math.floor(rand() * 500000) + 1000;
  const price = Math.round((rand() * 200 + 50) * 100) / 100;

  const id = `BRK-${10000 + index}`;
  const tradeRef = `TRD-${500000 + index * 7}`;

  const base: TradeBreak = {
    id,
    tradeRef,
    counterparty,
    breakType: overrides.breakType ?? pick(BREAK_TYPES),
    severity,
    status,
    ageHours,
    assignedTo: assignee,
    createdAt,
    updatedAt: createdAt,
    trade: {
      tradeRef,
      product: pick(PRODUCTS),
      buySell: rand() > 0.5 ? 'Buy' : 'Sell',
      quantity,
      price,
      currency: pick(['USD', 'EUR', 'GBP', 'JPY']),
      tradeDate: isoDaysAgo(Math.floor(ageHours / 24) + 1),
      settlementDate: isoDaysAgo(Math.max(Math.floor(ageHours / 24) - 2, 0)),
      counterparty,
      counterpartyLEI: `529900${Math.floor(rand() * 900000) + 100000}XYZ`,
      trader: pick(['R. Whitfield', 'A. Novak', 'T. Osei', 'L. Bergman']),
      book: pick(['Rates-EU-01', 'FX-G10-03', 'Credit-IG-02', 'EQ-Index-05']),
      isPartial: false,
    },
    counterpartyHistory: {
      totalBreaksLast90Days: Math.floor(rand() * 18),
      avgResolutionTimeHours: Math.round((rand() * 30 + 4) * 10) / 10,
      lastBreakDate: isoDaysAgo(Math.floor(rand() * 30) + 1),
    },
    auditTrail: buildAuditTrail(status, createdAt, assignee),
    requiresSeniorApproval: overrides.requiresSeniorApproval ?? (severity === 'Critical' && rand() > 0.4),
  };

  return { ...base, ...overrides, trade: { ...base.trade, ...(overrides.trade ?? {}) } };
}

export const MOCK_BREAKS: TradeBreak[] = [
  ...Array.from({ length: 24 }, (_, i) => buildBreak(i + 1)),

  // --- Explicit edge case: incomplete / missing trade data ---
  buildBreak(25, {
    id: 'BRK-10025',
    severity: 'High',
    status: 'New',
    breakType: 'Missing Confirmation',
    counterparty: 'Corriente Global Markets',
    requiresSeniorApproval: false,
    trade: {
      tradeRef: 'TRD-500175',
      product: 'Interest Rate Swap 5Y',
      buySell: 'Buy',
      quantity: null,
      price: null,
      currency: 'EUR',
      tradeDate: isoDaysAgo(1),
      settlementDate: null,
      counterparty: 'Corriente Global Markets',
      counterpartyLEI: null,
      trader: 'A. Novak',
      book: 'Rates-EU-01',
      isPartial: true,
    },
  }),

  // --- Explicit edge case: requires senior approval (permission-gated) ---
  buildBreak(26, {
    id: 'BRK-10026',
    severity: 'Critical',
    status: 'Escalated',
    breakType: 'SSI Mismatch',
    counterparty: 'Northwind Sovereign Fund',
    requiresSeniorApproval: true,
  }),

  // --- Explicit edge case: reopened after resolution ---
  buildBreak(27, {
    id: 'BRK-10027',
    severity: 'High',
    status: 'Reopened',
    breakType: 'Price Break',
    counterparty: 'Kestrel Prime Brokerage',
    requiresSeniorApproval: false,
  }),

  buildBreak(28, { requiresSeniorApproval: false }),
  buildBreak(29, { requiresSeniorApproval: false }),
  buildBreak(30, { requiresSeniorApproval: false }),
];
