import React from 'react';
import type { TransitResult, TransitAspect } from '@natal-chart/core';
import { getAspectGlyph, getAspectColor, formatPlanetName } from '../utils/chart-helpers';
import { PlanetGlyphIcon } from './GlyphIcon';

/**
 * Orb cutoff for this astroseek-style list (issue #56). Deliberately tighter
 * than TRANSIT_ASPECT_DEFS in TransitAspectGrid.tsx, which uses wider
 * per-aspect-type orbs (up to 6° for conjunction/opposition) for the grid —
 * this list shows only aspects within a flat 3° orb, per the customer ask.
 *
 * The applying/separating ('A'/'S') flag and orb are not recomputed here —
 * both already come from `TransitAspect` (packages/core/src/calculator.ts,
 * `calculateAspectsBetween`), the same per-aspect data `TransitAspectGrid`
 * reads for its cell tooltips.
 */
const LIST_ORB_LIMIT = 3;

interface TransitAspectListProps {
  transitData: TransitResult;
}

const headerStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.4rem 0.6rem',
  borderBottom: '2px solid #d4c9a8',
  backgroundColor: '#f5f0e8',
  fontSize: '0.8rem',
};

const cellStyle: React.CSSProperties = {
  padding: '0.35rem 0.6rem',
  borderBottom: '1px solid #e8e0d0',
  whiteSpace: 'nowrap',
};

export const TransitAspectList: React.FC<TransitAspectListProps> = ({ transitData }) => {
  // Tightest orb first, matching astroseek's convention of surfacing the most
  // exact (and so most significant) aspects at the top of the list.
  const rows: TransitAspect[] = transitData.aspects
    .filter(a => a.orb <= LIST_ORB_LIMIT)
    .slice()
    .sort((a, b) => a.orb - b.orb);

  if (rows.length === 0) {
    return (
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Natal-to-Transit Aspect List</h3>
        <p style={{ color: '#888', fontSize: '0.85rem' }}>No aspects within a 3° orb.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3>Natal-to-Transit Aspect List</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={headerStyle}>Natal</th>
              <th style={headerStyle}>Aspect</th>
              <th style={headerStyle}>Transit</th>
              <th style={headerStyle}>Orb</th>
              <th style={headerStyle} title="Applying / Separating">A/S</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={`${a.natalPlanet}-${a.type}-${a.transitPlanet}-${i}`}>
                <td style={cellStyle}>
                  <PlanetGlyphIcon planet={a.natalPlanet} size="1em" /> {formatPlanetName(a.natalPlanet)}
                </td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  <span className="glyph" style={{ color: getAspectColor(a.type) }}>
                    {getAspectGlyph(a.type)}
                  </span>
                </td>
                <td style={cellStyle}>
                  <PlanetGlyphIcon planet={a.transitPlanet} size="1em" /> {formatPlanetName(a.transitPlanet)}
                </td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>{a.orb.toFixed(2)}°</td>
                <td
                  style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}
                  title={a.applying ? 'Applying' : 'Separating'}
                >
                  {a.applying ? 'A' : 'S'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
