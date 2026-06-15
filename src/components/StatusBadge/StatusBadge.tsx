import type { BreakStatus } from '../../types';
import styles from './StatusBadge.module.css';

const CLASS_KEY: Record<BreakStatus, string> = {
  New: 'New',
  'In Progress': 'InProgress',
  Escalated: 'Escalated',
  Resolved: 'Resolved',
  Reopened: 'Reopened',
};

export function StatusBadge({ status }: { status: BreakStatus }) {
  return (
    <span className={`${styles.badge} ${styles[CLASS_KEY[status]]}`}>
      {status}
    </span>
  );
}
