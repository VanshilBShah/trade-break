import type { ReactNode } from 'react';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  /** Optional accessor used for sorting when different from render output. */
  sortValue?: (row: T) => string | number;
}

export type SortDirection = 'asc' | 'desc';

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSortChange?: (key: string) => void;
  /** Optional bulk-selection support. */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: (checked: boolean) => void;
  /** Optional per-row accent color rendered as a left-edge rail. */
  railClassName?: (row: T) => string | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  sortKey,
  sortDirection,
  onSortChange,
  selectable,
  selectedIds,
  onToggleRow,
  onToggleAll,
  railClassName,
  emptyTitle = 'No results',
  emptyDescription = 'Try adjusting your filters or search terms.',
}: DataTableProps<T>) {
  const allSelected =
    selectable && rows.length > 0 && rows.every((r) => selectedIds?.has(getRowId(r)));

  if (rows.length === 0) {
    return (
      <div className={styles.tableWrap}>
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>{emptyTitle}</p>
          <p>{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {railClassName && <th aria-hidden="true" className={styles.severityRail} />}
            {selectable && (
              <th className={styles.checkboxCell}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleAll?.(e.target.checked)}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                aria-sort={
                  col.sortable
                    ? sortKey === col.key
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                    : undefined
                }
              >
                {col.sortable ? (
                  <button
                    className={styles.sortButton}
                    onClick={() => onSortChange?.(col.key)}
                  >
                    {col.header}
                    <span
                      className={`${styles.sortIcon} ${
                        sortKey === col.key ? styles.sortIconActive : ''
                      }`}
                      aria-hidden="true"
                    >
                      {sortKey === col.key ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = getRowId(row);
            const selected = selectedIds?.has(id);
            return (
              <tr
                key={id}
                className={`${styles.row} ${selected ? styles.rowSelected : ''}`}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
              >
                {railClassName && (
                  <td
                    className={`${styles.severityRail} ${railClassName(row) ?? ''}`}
                    aria-hidden="true"
                  />
                )}
                {selectable && (
                  <td
                    className={styles.checkboxCell}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected ?? false}
                      onChange={() => onToggleRow?.(id)}
                      aria-label={`Select row ${id}`}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key}>{col.render(row)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
