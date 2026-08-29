import type { CSSProperties } from 'react';

/**
 * Shared "astroseek-density" table styles (issue #56, extended to Zodiacal
 * Releasing by issue #61): small type, tight cell padding, hairline row
 * rules, content-width rather than viewport-width. Used by
 * TransitAspectList and ReleasingTimeline so the app's data tables read as
 * one family instead of re-diverging per component.
 */

/** Apply to the outer <table>. Shrinks the table to its content instead of
 * stretching to the full width of its container. */
export const compactTableStyle: CSSProperties = {
  borderCollapse: 'collapse',
  fontSize: '0.85rem',
  width: 'auto',
  maxWidth: '760px',
};

export const compactTableHeaderStyle: CSSProperties = {
  textAlign: 'left',
  padding: '0.4rem 0.6rem',
  borderBottom: '2px solid #d4c9a8',
  backgroundColor: '#f5f0e8',
  fontSize: '0.8rem',
};

export const compactTableCellStyle: CSSProperties = {
  padding: '0.35rem 0.6rem',
  borderBottom: '1px solid #e8e0d0',
};
