import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'workspace:context';

const readStored = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const v = localStorage.getItem(STORAGE_KEY);
  return v && v !== '__personal__' ? v : undefined;
};

export function useWorkspaceContext() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(
    readStored,
  );

  const setContext = useCallback((orgId: string | undefined) => {
    setSelectedOrgId(orgId);
    localStorage.setItem(STORAGE_KEY, orgId ?? '__personal__');
    // Dispatch a storage event so other tabs pick up the change.
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: orgId ?? '__personal__',
      }),
    );
  }, []);

  // Resets to personal context if the selected org is no longer in the available list.
  const validateContext = useCallback(
    (availableOrgIds: string[]) => {
      if (selectedOrgId && !availableOrgIds.includes(selectedOrgId)) {
        setContext(undefined);
        return false;
      }
      return true;
    },
    [selectedOrgId, setContext],
  );

  // Keep state in sync when the context is changed in another tab.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue;
      setSelectedOrgId(next && next !== '__personal__' ? next : undefined);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return { selectedOrgId, setContext, validateContext };
}
