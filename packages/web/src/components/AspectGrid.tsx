import React from 'react';
import type { ChartResult, Aspect, AspectType } from '@natal-chart/core';
import { getPlanetGlyph, getAspectGlyph, getAspectColor } from '../utils/chart-helpers';

/** Points shown on the grid diagonal: all calculated planets + ASC + MC */
interface GridPoint {
  key: string;
  glyph: string;
  longitude: number;
  retrograde: boolean;
  isTextLabel: boolean;
}

/** Aspect definitions matching core/calculator.ts (non-luminary orbs for ASC/MC) */
const ASPECT_DEFS: { angle: number; orb: number; type: AspectType }[] = [
  { angle: 0, orb: 8, type: 'conjunction' },
  { angle: 180, orb: 8, type: 'opposition' },
  { angle: 120, orb: 6, type: 'trine' },
  { angle: 90, orb: 6, type: 'square' },
  { angle: 60, orb: 4, type: 'sextile' },
  { angle: 150, orb: 3, type: 'quincunx' },
  { angle: 30, orb: 2, type: 'semiSextile' },
];

/** Wider orbs for luminary (Sun/Moon) aspects */
const LUMINARY_ASPECT_DEFS: { angle: number; orb: number; type: AspectType }[] = [
  { angle: 0, orb: 10, type: 'conjunction' },
  { angle: 180, orb: 10, type: 'opposition' },
  { angle: 120, orb: 10, type: 'trine' },
  { angle: 90, orb: 10, type: 'square' },
  { angle: 60, orb: 6, type: 'sextile' },
  { angle: 150, orb: 3, type: 'quincunx' },
  { angle: 30, orb: 2, type: 'semiSextile' },
];

const LUMINARIES = new Set(['sun', 'moon']);

interface AspectGridProps {
  chartData: ChartResult;
}

/** Build a lookup: key "p1|p2" → array of aspects (longitude + parallel) */
function buildAspectMap(aspects: Aspect[]): Map<string, Aspect[]> {
  const map = new Map<string, Aspect[]>();
  for (const a of aspects) {
    const k1 = `${a.planet1}|${a.planet2}`;
    const k2 = `${a.planet2}|${a.planet1}`;
    if (!map.has(k1)) map.set(k1, []);
    if (!map.has(k2)) map.set(k2, []);
    map.get(k1)!.push(a);
    map.get(k2)!.push(a);
  }
  return map;
}

/** Calculate longitude aspect between two points (for ASC/MC pairs) */
function findAspect(lon1: number, lon2: number, isLuminary: boolean): { type: AspectType; orb: number } | null {
  let diff = Math.abs(lon1 - lon2);
  if (diff > 180) diff = 360 - diff;
  const defs = isLuminary ? LUMINARY_ASPECT_DEFS : ASPECT_DEFS;
  for (const def of defs) {
    if (Math.abs(diff - def.angle) <= def.orb) {
      return { type: def.type, orb: Math.abs(diff - def.angle) };
    }
  }
  return null;
}

interface CellAspect {
  type: AspectType;
  orb: number;
}

const CELL_SIZE = 34;

export const AspectGrid: React.FC<AspectGridProps> = ({ chartData }) => {
  // Build ordered list of grid points
  const points: GridPoint[] = chartData.planets.map(p => ({
    key: p.planet,
    glyph: getPlanetGlyph(p.planet),
    longitude: p.longitude,
    retrograde: p.retrograde,
    isTextLabel: p.planet === 'vertex',
  }));
  points.push(
    { key: 'asc', glyph: 'AC', longitude: chartData.angles.ascendant, retrograde: false, isTextLabel: true },
    { key: 'mc', glyph: 'MC', longitude: chartData.angles.midheaven, retrograde: false, isTextLabel: true },
  );

  // Lookup for existing planet–planet aspects (may have multiple per pair)
  const aspectMap = buildAspectMap(chartData.aspects);

  // Longitude lookup for all points
  const lonMap = new Map<string, number>();
  for (const pt of points) {
    lonMap.set(pt.key, pt.longitude);
  }

  /** Get all aspects between two grid points */
  function getGridAspects(keyA: string, keyB: string): CellAspect[] {
    // Pre-computed aspects (includes longitude + parallel/contraparallel)
    const existing = aspectMap.get(`${keyA}|${keyB}`);
    if (existing && existing.length > 0) {
      return existing.map(a => ({ type: a.type, orb: a.orb }));
    }

    // Calculate for ASC/MC pairs (longitude only)
    const lonA = lonMap.get(keyA);
    const lonB = lonMap.get(keyB);
    if (lonA === undefined || lonB === undefined) return [];
    const isLuminary = LUMINARIES.has(keyA) || LUMINARIES.has(keyB);
    const asp = findAspect(lonA, lonB, isLuminary);
    return asp ? [asp] : [];
  }

  const n = points.length;
  const gridWidth = n * CELL_SIZE;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          borderCollapse: 'collapse',
          width: `${gridWidth}px`,
          tableLayout: 'fixed',
        }}
      >
        <tbody>
          {points.map((rowPt, row) => (
            <tr key={rowPt.key}>
              {points.map((colPt, col) => {
                // Diagonal cell: planet glyph label + retrograde indicator
                if (row === col) {
                  return (
                    <td
                      key={colPt.key}
                      style={{
                        width: `${CELL_SIZE}px`,
                        height: `${CELL_SIZE}px`,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        backgroundColor: '#f5f0e8',
                        border: '1px solid #d4c9a8',
                        fontWeight: 'bold',
                        fontSize: rowPt.isTextLabel ? '0.7rem' : '1rem',
                        padding: 0,
                        position: 'relative',
                      }}
                    >
                      <span className={!rowPt.isTextLabel ? 'glyph' : undefined}>
                        {rowPt.glyph}
                      </span>
                      {rowPt.retrograde && (
                        <span style={{
                          position: 'absolute',
                          bottom: 1,
                          right: 2,
                          fontSize: '0.5rem',
                          color: '#cc3333',
                          fontWeight: 'bold',
                        }}>
                          R
                        </span>
                      )}
                    </td>
                  );
                }

                // Lower-left triangle: show aspect(s)
                if (col < row) {
                  const aspects = getGridAspects(rowPt.key, colPt.key);
                  const hasAspect = aspects.length > 0;
                  return (
                    <td
                      key={colPt.key}
                      style={{
                        width: `${CELL_SIZE}px`,
                        height: `${CELL_SIZE}px`,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        border: '1px solid #d4c9a8',
                        padding: 0,
                        fontSize: '0.65rem',
                        lineHeight: 1.1,
                        backgroundColor: hasAspect ? '#fff' : '#faf7f0',
                      }}
                      title={
                        hasAspect
                          ? aspects.map(a => `${a.type} (${a.orb.toFixed(1)}°)`).join(', ')
                          : undefined
                      }
                    >
                      {aspects.length === 1 && (
                        <>
                          <span
                            className="glyph"
                            style={{
                              color: getAspectColor(aspects[0]!.type),
                              fontSize: '0.9rem',
                              display: 'block',
                              lineHeight: 1,
                            }}
                          >
                            {getAspectGlyph(aspects[0]!.type)}
                          </span>
                          <span style={{ color: '#888', fontSize: '0.55rem' }}>
                            {aspects[0]!.orb.toFixed(1)}°
                          </span>
                        </>
                      )}
                      {aspects.length >= 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                          {aspects.map((a, i) => (
                            <span
                              key={i}
                              className="glyph"
                              style={{
                                color: getAspectColor(a.type),
                                fontSize: '0.7rem',
                                lineHeight: 1,
                              }}
                              title={`${a.type} (${a.orb.toFixed(1)}°)`}
                            >
                              {getAspectGlyph(a.type)}
                              <span style={{ color: '#888', fontSize: '0.45rem', marginLeft: 1 }}>
                                {a.orb.toFixed(1)}°
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                }

                // Upper-right triangle: empty / hidden
                return (
                  <td
                    key={colPt.key}
                    style={{
                      width: `${CELL_SIZE}px`,
                      height: `${CELL_SIZE}px`,
                      border: 'none',
                      padding: 0,
                    }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
