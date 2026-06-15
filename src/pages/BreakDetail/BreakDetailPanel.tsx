import { useState } from 'react';
import { Modal } from '../../components/Modal/Modal';
import { Button } from '../../components/Button/Button';
import { FormField } from '../../components/FormField/FormField';
import { SeverityTag } from '../../components/SeverityTag/SeverityTag';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { useRole, canActOnBreak } from '../../context/RoleContext';
import { REASON_CODES } from '../../types';
import type { TradeBreak, ResolutionAction, AuditEntry, BreakStatus } from '../../types';
import { USERS } from '../../data/mockBreaks';
import styles from './BreakDetail.module.css';

interface BreakDetailPanelProps {
  brk: TradeBreak;
  onClose: () => void;
  onUpdate: (updater: (b: TradeBreak) => TradeBreak) => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function availableActions(status: BreakStatus): ResolutionAction[] {
  switch (status) {
    case 'New':
    case 'In Progress':
      return ['Resolve', 'Escalate', 'Reassign'];
    case 'Escalated':
      return ['Resolve', 'Reassign'];
    case 'Resolved':
      return ['Reopen'];
    case 'Reopened':
      return ['Resolve', 'Escalate', 'Reassign'];
    default:
      return [];
  }
}

function statusForAction(action: ResolutionAction, current: BreakStatus): BreakStatus {
  switch (action) {
    case 'Resolve':
      return 'Resolved';
    case 'Escalate':
      return 'Escalated';
    case 'Reopen':
      return 'Reopened';
    case 'Reassign':
      return current;
  }
}

export function BreakDetailPanel({ brk, onClose, onUpdate }: BreakDetailPanelProps) {
  const { role, currentUserName } = useRole();
  const actions = availableActions(brk.status);
  const [activeAction, setActiveAction] = useState<ResolutionAction>(actions[0] ?? 'Resolve');
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [errors, setErrors] = useState<{ reason?: string; assignee?: string }>({});
  const [justSubmitted, setJustSubmitted] = useState(false);

  const canAct = canActOnBreak(role, brk.requiresSeniorApproval);
  const { trade } = brk;

  function selectAction(action: ResolutionAction) {
    setActiveAction(action);
    setReasonCode('');
    setNote('');
    setNewAssignee('');
    setErrors({});
    setJustSubmitted(false);
  }

  function handleSubmit() {
    const nextErrors: { reason?: string; assignee?: string } = {};
    if (!reasonCode) nextErrors.reason = 'Select a reason code before submitting.';
    if (activeAction === 'Reassign' && !newAssignee) {
      nextErrors.assignee = 'Select an assignee before submitting.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const toStatus = statusForAction(activeAction, brk.status);
    const assigneeName = newAssignee
      ? USERS.find((u) => u.id === newAssignee)?.name ?? newAssignee
      : brk.assignedTo;

    const entry: AuditEntry = {
      id: `ae-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: currentUserName,
      action: activeAction,
      reasonCode,
      note: note.trim() || undefined,
      fromStatus: brk.status,
      toStatus,
    };

    onUpdate((b) => ({
      ...b,
      status: toStatus,
      assignedTo: activeAction === 'Reassign' ? assigneeName : b.assignedTo,
      updatedAt: entry.timestamp,
      auditTrail: [...b.auditTrail, entry],
    }));

    setReasonCode('');
    setNote('');
    setNewAssignee('');
    setErrors({});
    setJustSubmitted(true);
  }

  return (
    <Modal title={brk.id} onClose={onClose}>
      <div className={styles.headerRow}>
        <SeverityTag severity={brk.severity} />
        <StatusBadge status={brk.status} />
      </div>
      <p className={styles.metaLine}>
        {brk.breakType} · Trade {brk.tradeRef} · {brk.counterparty}
      </p>

      {brk.status === 'Reopened' && (
        <div className={`${styles.banner} ${styles.bannerReopened}`}>
          <span className={styles.bannerIcon} aria-hidden="true">↺</span>
          <span>
            <span className={styles.bannerTitle}>Reopened after resolution</span>
            This break was previously marked Resolved and has since been reopened. Review the
            audit trail below for why it came back before taking further action.
          </span>
        </div>
      )}

      {trade.isPartial && (
        <div className={`${styles.banner} ${styles.bannerWarning}`}>
          <span className={styles.bannerIcon} aria-hidden="true">⚠</span>
          <span>
            <span className={styles.bannerTitle}>Trade data unavailable</span>
            One or more fields could not be retrieved from the source system for this trade.
            Confirm details directly with the desk or counterparty before resolving.
          </span>
        </div>
      )}

      {!canAct && (
        <div className={`${styles.banner} ${styles.bannerLocked}`}>
          <span className={styles.bannerIcon} aria-hidden="true">🔒</span>
          <span>
            <span className={styles.bannerTitle}>Senior Ops / Compliance approval required</span>
            This break exceeds the Ops Analyst approval threshold. You can review full details
            below, but resolution actions are disabled until a Senior Ops or Compliance user
            takes action. Switch roles using the selector in the header to simulate that view.
          </span>
        </div>
      )}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Trade Details</h3>
        <div className={styles.dataGrid}>
          <DataItem label="Product" value={trade.product} />
          <DataItem label="Buy / Sell" value={trade.buySell} />
          <DataItem
            label="Quantity"
            value={trade.quantity !== null ? trade.quantity.toLocaleString('en-US') : null}
          />
          <DataItem
            label="Price"
            value={trade.price !== null ? `${trade.price.toFixed(2)} ${trade.currency}` : null}
          />
          <DataItem label="Trade Date" value={formatDate(trade.tradeDate)} />
          <DataItem label="Settlement Date" value={formatDate(trade.settlementDate)} />
          <DataItem label="Trader" value={trade.trader} />
          <DataItem label="Book" value={trade.book} />
          <DataItem label="Counterparty LEI" value={trade.counterpartyLEI} />
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Counterparty History</h3>
        <div className={styles.historyRow}>
          <div className={styles.historyStat}>
            <span className={styles.historyStatValue}>
              {brk.counterpartyHistory.totalBreaksLast90Days}
            </span>
            <span className={styles.historyStatLabel}>Breaks, last 90 days</span>
          </div>
          <div className={styles.historyStat}>
            <span className={styles.historyStatValue}>
              {brk.counterpartyHistory.avgResolutionTimeHours}h
            </span>
            <span className={styles.historyStatLabel}>Avg. resolution time</span>
          </div>
          <div className={styles.historyStat}>
            <span className={styles.historyStatValue}>
              {formatDate(brk.counterpartyHistory.lastBreakDate)}
            </span>
            <span className={styles.historyStatLabel}>Last break</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Audit Trail</h3>
        <ol className={styles.timeline}>
          {brk.auditTrail.map((entry) => (
            <li key={entry.id} className={styles.timelineItem}>
              <div className={styles.timelineHeader}>
                <span>
                  {entry.action}
                  {entry.fromStatus && entry.toStatus ? ` · ${entry.fromStatus} → ${entry.toStatus}` : ''}
                </span>
                <span className={styles.timelineTime}>{formatDateTime(entry.timestamp)}</span>
              </div>
              <div className={styles.timelineMeta}>{entry.actor}</div>
              {entry.note && <div className={styles.timelineMeta}>{entry.note}</div>}
              {entry.reasonCode && (
                <span className={styles.timelineReason}>{entry.reasonCode}</span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {canAct && actions.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Resolution Action</h3>
          {justSubmitted && (
            <div className={styles.successNote}>
              Action recorded and the audit trail has been updated.
            </div>
          )}
          <div className={styles.actionTabs} role="tablist" aria-label="Resolution action type">
            {actions.map((action) => (
              <button
                key={action}
                role="tab"
                aria-selected={activeAction === action}
                className={`${styles.actionTab} ${
                  activeAction === action ? styles.actionTabActive : ''
                }`}
                onClick={() => selectAction(action)}
              >
                {action}
              </button>
            ))}
          </div>

          {activeAction === 'Reassign' && (
            <FormField
              as="select"
              label="Assign to"
              required
              value={newAssignee}
              onChange={setNewAssignee}
              options={USERS.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))}
              error={errors.assignee}
            />
          )}

          <FormField
            as="select"
            label="Reason code"
            required
            value={reasonCode}
            onChange={setReasonCode}
            options={REASON_CODES[activeAction].map((r) => ({ value: r, label: r }))}
            error={errors.reason}
          />

          <FormField
            as="textarea"
            label="Notes"
            value={note}
            onChange={setNote}
            placeholder="Optional context for anyone reviewing this break later…"
            hint="Visible to the full Ops team in the audit trail."
          />

          <Button variant="primary" onClick={handleSubmit}>
            Submit {activeAction}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function DataItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={styles.dataItem}>
      <span className={styles.dataLabel}>{label}</span>
      <span className={`${styles.dataValue} ${value === null ? styles.dataValueMissing : ''}`}>
        {value ?? 'Data unavailable'}
      </span>
    </div>
  );
}
