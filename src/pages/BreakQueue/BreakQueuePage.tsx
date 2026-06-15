import { useMemo, useState } from 'react';
import { DataTable } from '../../components/DataTable/DataTable';
import type { Column, SortDirection } from '../../components/DataTable/DataTable';
import { SeverityTag } from '../../components/SeverityTag/SeverityTag';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import { FormField } from '../../components/FormField/FormField';
import { BreakDetailPanel } from '../BreakDetail/BreakDetailPanel';
import { MOCK_BREAKS, USERS } from '../../data/mockBreaks';
import { REASON_CODES } from '../../types';
import type { TradeBreak, Severity, BreakStatus, BreakType, AuditEntry } from '../../types';
import { useRole, canActOnBreak } from '../../context/RoleContext';
import styles from './BreakQueue.module.css';
import tableStyles from '../../components/DataTable/DataTable.module.css';

const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: BreakStatus[] = ['New', 'In Progress', 'Escalated', 'Resolved', 'Reopened'];
const BREAK_TYPES: BreakType[] = [
  'Quantity Mismatch',
  'Price Break',
  'Settlement Date Mismatch',
  'Missing Confirmation',
  'Counterparty Static Data Mismatch',
  'SSI Mismatch',
];

const RAIL_CLASS: Record<Severity, string> = {
  Critical: tableStyles.railCritical,
  High: tableStyles.railHigh,
  Medium: tableStyles.railMedium,
  Low: tableStyles.railLow,
};

function formatAge(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return `${days}d ${rem}h`;
}

function userName(id: string | null): string | null {
  if (!id) return null;
  const byId = USERS.find((u) => u.id === id);
  if (byId) return byId.name;
  // assignedTo is stored as a display name in mock data
  return id;
}

export function BreakQueuePage() {
  const { role, currentUserName } = useRole();
  const [breaks, setBreaks] = useState<TradeBreak[]>(MOCK_BREAKS);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'All' | Severity>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | BreakStatus>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | BreakType>('All');
  const [sortKey, setSortKey] = useState<string>('ageHours');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openBreakId, setOpenBreakId] = useState<string | null>(null);
  const [bulkModal, setBulkModal] = useState<'assign' | 'escalate' | null>(null);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkReasonCode, setBulkReasonCode] = useState('');
  const [bulkError, setBulkError] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return breaks.filter((b) => {
      if (severityFilter !== 'All' && b.severity !== severityFilter) return false;
      if (statusFilter !== 'All' && b.status !== statusFilter) return false;
      if (typeFilter !== 'All' && b.breakType !== typeFilter) return false;
      if (q) {
        const haystack = `${b.id} ${b.tradeRef} ${b.counterparty}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [breaks, search, severityFilter, statusFilter, typeFilter]);

  const sorted = useMemo(() => {
    const severityRank: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'severity':
          cmp = severityRank[a.severity] - severityRank[b.severity];
          break;
        case 'ageHours':
          cmp = a.ageHours - b.ageHours;
          break;
        case 'id':
          cmp = a.id.localeCompare(b.id);
          break;
        case 'counterparty':
          cmp = a.counterparty.localeCompare(b.counterparty);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        default:
          cmp = 0;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDirection]);

  function handleSortChange(key: string) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(sorted.map((b) => b.id)) : new Set());
  }

  function updateBreak(id: string, updater: (b: TradeBreak) => TradeBreak) {
    setBreaks((prev) => prev.map((b) => (b.id === id ? updater(b) : b)));
  }

  const selectedBreaks = sorted.filter((b) => selectedIds.has(b.id));
  const selectedActionable = selectedBreaks.filter((b) => canActOnBreak(role, b.requiresSeniorApproval));
  const selectedBlocked = selectedBreaks.length - selectedActionable.length;

  function closeBulkModal() {
    setBulkModal(null);
    setBulkAssignee('');
    setBulkReasonCode('');
    setBulkError('');
  }

  function submitBulkAssign() {
    if (!bulkAssignee) {
      setBulkError('Select an assignee to continue.');
      return;
    }
    const assigneeName = USERS.find((u) => u.id === bulkAssignee)?.name ?? bulkAssignee;
    selectedActionable.forEach((b) => {
      const entry: AuditEntry = {
        id: `ae-${Date.now()}-${b.id}`,
        timestamp: new Date().toISOString(),
        actor: currentUserName,
        action: 'Reassign',
        reasonCode: 'Workload rebalancing',
        note: `Bulk-assigned to ${assigneeName}.`,
      };
      updateBreak(b.id, (br) => ({
        ...br,
        assignedTo: assigneeName,
        auditTrail: [...br.auditTrail, entry],
      }));
    });
    setSelectedIds(new Set());
    closeBulkModal();
  }

  function submitBulkEscalate() {
    if (!bulkReasonCode) {
      setBulkError('Select a reason code to continue.');
      return;
    }
    selectedActionable.forEach((b) => {
      const entry: AuditEntry = {
        id: `ae-${Date.now()}-${b.id}`,
        timestamp: new Date().toISOString(),
        actor: currentUserName,
        action: 'Escalate',
        reasonCode: bulkReasonCode,
        fromStatus: b.status,
        toStatus: 'Escalated',
      };
      updateBreak(b.id, (br) => ({
        ...br,
        status: 'Escalated',
        auditTrail: [...br.auditTrail, entry],
      }));
    });
    setSelectedIds(new Set());
    closeBulkModal();
  }

  const counts = useMemo(() => {
    const critical = breaks.filter((b) => b.severity === 'Critical' && b.status !== 'Resolved').length;
    const open = breaks.filter((b) => b.status !== 'Resolved').length;
    const escalated = breaks.filter((b) => b.status === 'Escalated').length;
    const reopened = breaks.filter((b) => b.status === 'Reopened').length;
    return { critical, open, escalated, reopened };
  }, [breaks]);

  const columns: Column<TradeBreak>[] = [
    {
      key: 'id',
      header: 'Break ID',
      sortable: true,
      render: (b) => <span className={tableStyles.mono}>{b.id}</span>,
    },
    {
      key: 'tradeRef',
      header: 'Trade Ref',
      render: (b) => <span className={tableStyles.mono}>{b.tradeRef}</span>,
    },
    {
      key: 'counterparty',
      header: 'Counterparty',
      sortable: true,
      render: (b) => b.counterparty,
    },
    {
      key: 'breakType',
      header: 'Break Type',
      render: (b) => b.breakType,
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      render: (b) => <SeverityTag severity={b.severity} />,
    },
    {
      key: 'ageHours',
      header: 'Age',
      sortable: true,
      render: (b) => (
        <span className={b.ageHours > 48 ? styles.ageWarning : undefined}>
          {formatAge(b.ageHours)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (b) =>
        userName(b.assignedTo) ? (
          <span className={styles.assignedCell}>{userName(b.assignedTo)}</span>
        ) : (
          <span className={styles.unassigned}>Unassigned</span>
        ),
    },
  ];

  const openBreak = breaks.find((b) => b.id === openBreakId) ?? null;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Break Queue</h1>
          <p className={styles.pageSubtitle}>
            {sorted.length} of {breaks.length} breaks shown
          </p>
        </div>
        <div className={styles.summaryStrip}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{counts.open}</span>
            <span className={styles.summaryLabel}>Open</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{counts.critical}</span>
            <span className={styles.summaryLabel}>Critical open</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{counts.escalated}</span>
            <span className={styles.summaryLabel}>Escalated</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{counts.reopened}</span>
            <span className={styles.summaryLabel}>Reopened</span>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search Break ID, Trade Ref, or Counterparty…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search breaks"
        />
        <label className={styles.filterLabel}>
          Severity
          <select
            className={styles.filterSelect}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as 'All' | Severity)}
          >
            <option value="All">All severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterLabel}>
          Status
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | BreakStatus)}
          >
            <option value="All">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterLabel}>
          Break Type
          <select
            className={styles.filterSelect}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'All' | BreakType)}
          >
            <option value="All">All types</option>
            {BREAK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {(search || severityFilter !== 'All' || statusFilter !== 'All' || typeFilter !== 'All') && (
          <Button
            variant="ghost"
            size="sm"
            className={styles.clearButton}
            onClick={() => {
              setSearch('');
              setSeverityFilter('All');
              setStatusFilter('All');
              setTypeFilter('All');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkText}>
            {selectedIds.size} break{selectedIds.size > 1 ? 's' : ''} selected
            {selectedBlocked > 0 &&
              ` · ${selectedBlocked} require senior approval and will be skipped`}
          </span>
          <div className={styles.bulkActions}>
            <Button size="sm" variant="secondary" onClick={() => setBulkModal('assign')}>
              Bulk assign
            </Button>
            <Button size="sm" variant="danger" onClick={() => setBulkModal('escalate')}>
              Bulk escalate
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear selection
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={sorted}
        getRowId={(b) => b.id}
        onRowClick={(b) => setOpenBreakId(b.id)}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        selectable
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        railClassName={(b) => RAIL_CLASS[b.severity]}
        emptyTitle="No breaks match these filters"
        emptyDescription="Clear a filter or broaden your search to see more results."
      />

      {openBreak && (
        <BreakDetailPanel
          brk={openBreak}
          onClose={() => setOpenBreakId(null)}
          onUpdate={(updater) => updateBreak(openBreak.id, updater)}
        />
      )}

      {bulkModal === 'assign' && (
        <Modal
          title="Bulk assign breaks"
          onClose={closeBulkModal}
          footer={
            <>
              <Button variant="ghost" onClick={closeBulkModal}>
                Cancel
              </Button>
              <Button variant="primary" onClick={submitBulkAssign}>
                Assign {selectedActionable.length} break{selectedActionable.length === 1 ? '' : 's'}
              </Button>
            </>
          }
        >
          <p className={styles.pageSubtitle}>
            Reassigning {selectedActionable.length} of {selectedBreaks.length} selected breaks.
            {selectedBlocked > 0 &&
              ` ${selectedBlocked} require senior approval and won't be changed by this action.`}
          </p>
          <FormField
            as="select"
            label="Assign to"
            required
            value={bulkAssignee}
            onChange={setBulkAssignee}
            options={USERS.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))}
            error={bulkError || undefined}
          />
        </Modal>
      )}

      {bulkModal === 'escalate' && (
        <Modal
          title="Bulk escalate breaks"
          onClose={closeBulkModal}
          footer={
            <>
              <Button variant="ghost" onClick={closeBulkModal}>
                Cancel
              </Button>
              <Button variant="danger" onClick={submitBulkEscalate}>
                Escalate {selectedActionable.length} break{selectedActionable.length === 1 ? '' : 's'}
              </Button>
            </>
          }
        >
          <p className={styles.pageSubtitle}>
            Escalating {selectedActionable.length} of {selectedBreaks.length} selected breaks.
            {selectedBlocked > 0 &&
              ` ${selectedBlocked} require senior approval and won't be changed by this action.`}
          </p>
          <FormField
            as="select"
            label="Reason code"
            required
            value={bulkReasonCode}
            onChange={setBulkReasonCode}
            options={REASON_CODES.Escalate.map((r) => ({ value: r, label: r }))}
            error={bulkError || undefined}
          />
        </Modal>
      )}
    </div>
  );
}
