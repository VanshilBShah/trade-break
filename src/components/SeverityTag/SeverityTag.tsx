import type { Severity } from '../../types';
import styles from './SeverityTag.module.css';

export function SeverityTag({ severity }: { severity: Severity }) {
  return (
    <span className={`${styles.tag} ${styles[severity]}`}>
      <span className={styles.dot} aria-hidden="true" />
      {severity}
    </span>
  );
}
