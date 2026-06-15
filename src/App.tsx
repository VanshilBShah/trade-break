import { RoleProvider, useRole } from './context/RoleContext';
import { BreakQueuePage } from './pages/BreakQueue/BreakQueuePage';
import { USERS } from './data/mockBreaks';
import type { UserRole } from './types';
import styles from './App.module.css';

function Header() {
  const { role, setRole, currentUserName } = useRole();
  const currentUser = USERS.find((u) => u.name === currentUserName);
  const roles: UserRole[] = ['Ops Analyst', 'Senior Ops / Compliance'];

  return (
    <header className={styles.header}>
      <div className={styles.brandRow}>
        <div className={styles.brandMark} aria-hidden="true" />
        <div className={styles.brandText}>
          <span className={styles.brandTitle}>Trade Break Resolution Console</span>
          <span className={styles.brandSubtitle}>Settlements Operations · Prod</span>
        </div>
      </div>
      <div className={styles.headerRight}>
        <div className={styles.roleSwitcher}>
          <label className={styles.roleLabel} htmlFor="role-switcher">
            Viewing as
          </label>
          <select
            id="role-switcher"
            className={styles.roleSelect}
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.userChip}>
          <div className={styles.avatar} aria-hidden="true">
            {currentUser?.initials ?? '—'}
          </div>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <RoleProvider>
      <div className={styles.shell}>
        <Header />
        <main className={styles.main}>
          <BreakQueuePage />
        </main>
      </div>
    </RoleProvider>
  );
}

export default App;
