import { useSyncExternalStore } from 'react';

interface ResponsiveValues {
  /** True when viewport <= 640px (phone portrait) */
  isMobile: boolean;
  /** True when viewport 641-1024px */
  isTablet: boolean;
  /** True when viewport >= 1025px (current layout) */
  isDesktop: boolean;
}

const smQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)') : null;
const mdQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 1024px)') : null;

function subscribe(callback: () => void): () => void {
  smQuery?.addEventListener('change', callback);
  mdQuery?.addEventListener('change', callback);
  return () => {
    smQuery?.removeEventListener('change', callback);
    mdQuery?.removeEventListener('change', callback);
  };
}

function getSnapshot(): string {
  const sm = smQuery?.matches ?? false;
  const md = mdQuery?.matches ?? false;
  return `${sm}|${md}`;
}

function getServerSnapshot(): string {
  return 'false|false';
}

/**
 * Responsive breakpoint hook using window.matchMedia.
 * - sm: <= 640px (mobile)
 * - md: 641-1024px (tablet)
 * - lg: >= 1025px (desktop)
 */
export function useResponsive(): ResponsiveValues {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [smStr, mdStr] = snapshot.split('|');
  const sm = smStr === 'true';
  const md = mdStr === 'true';

  return {
    isMobile: sm,
    isTablet: md && !sm,
    isDesktop: !md,
  };
}
