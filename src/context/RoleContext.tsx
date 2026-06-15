import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { UserRole } from '../types';
import { USERS } from '../data/mockBreaks';

interface RoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentUserName: string;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

/**
 * Simulates "logging in as" a given role. Swapping roles re-derives which
 * users represent that role so the header always shows a plausible current
 * user, without needing real auth.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('Ops Analyst');

  const currentUserName = useMemo(() => {
    const match = USERS.find((u) => u.role === role);
    return match ? match.name : USERS[0].name;
  }, [role]);

  const value = useMemo(
    () => ({ role, setRole, currentUserName }),
    [role, currentUserName],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return ctx;
}

/**
 * Central permission logic for resolution actions. Kept in one place so the
 * "who can do what" rule set is auditable and doesn't drift across
 * components. Senior Ops / Compliance can act on anything; Ops Analysts
 * cannot act on breaks flagged requiresSeniorApproval.
 */
export function canActOnBreak(role: UserRole, requiresSeniorApproval: boolean): boolean {
  if (role === 'Senior Ops / Compliance') return true;
  return !requiresSeniorApproval;
}
