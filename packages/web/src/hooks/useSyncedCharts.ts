import { useMemo } from 'react';
import { useSync } from '../contexts/SyncContext';
import { getSavedCharts, type SavedChart } from '../services/savedCharts';

/** Returns saved charts from localStorage, re-reading when sync updates occur. */
export function useSyncedCharts(): SavedChart[] {
  const { chartRevision } = useSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getSavedCharts(), [chartRevision]);
}
