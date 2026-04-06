import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fullSync } from '../services/savedCharts';

interface SyncContextType {
  syncStatus: 'idle' | 'syncing';
  chartRevision: number;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};

interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing'>('idle');
  const [chartRevision, setChartRevision] = useState(0);
  const syncInProgress = useRef(false);

  const runSync = useCallback(async () => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setSyncStatus('syncing');
    try {
      await fullSync(() => {
        setChartRevision(r => r + 1);
      });
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      // Final bump to ensure UI is up-to-date
      setChartRevision(r => r + 1);
      setSyncStatus('idle');
      syncInProgress.current = false;
    }
  }, []);

  // Auto-sync when user logs in
  useEffect(() => {
    if (user) {
      runSync();
    }
  }, [user, runSync]);

  const triggerSync = useCallback(async () => {
    await runSync();
  }, [runSync]);

  return (
    <SyncContext.Provider value={{ syncStatus, chartRevision, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
};
