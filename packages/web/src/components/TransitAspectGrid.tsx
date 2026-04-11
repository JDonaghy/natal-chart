import React from 'react';
import type { ChartResult, TransitResult, AspectType, ZodiacSign } from '@natal-chart/core';
import { getAspectGlyph, getAspectColor } from '../utils/chart-helpers';
import { PlanetGlyphIcon, SignGlyphIcon } from './GlyphIcon';
import { useResponsive } from '../hooks/useResponsive';

/** Transit aspect orbs (tighter than natal, matching calculator.ts) */
const TRANSIT_ASPECT_DEFS: { angle: number; orb: number; type: AspectType }[] = [
  { angle: 0, orb: 6, type: 'conjunction' },
  { angle: 180, orb: 6, type: 'opposition' },
  { angle: 120, orb: 4, type: 'trine' },
  { angle: 90, orb: 4, type: 'square' },
  { angle: 60, orb: 3, type: 'sextile' },
  { angle: 150, orb: 2, type: 'quincunx' },
  { angle: 30, orb: 1.5, type: 'semiSextile' },
];

const SIGN_ELEMENT_COLORS: Record<string, string> = {
  aries: '#CC3333', leo: '#CC3333', sagittarius: '#CC3333',
  taurus: '#338833', virgo: '#338833', capricorn: '#338833',
  gemini: '#CCAA00', libra: '#CCAA00', aquarius: '#CCAA00',
  cancer: '#3366CC', scorpio: '#3366CC', pisces: '#3366CC',
};

interface NatalPoint {
  key: string;
  glyph: string;
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  minute: number;
  isTextLabel: boolean;
}

interface CellAspect {
  type: AspectType;
  orb: number;
}

function signFromLongitude(longitude: number): ZodiacSign {
  const signs: ZodiacSign[] = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];
  return signs[Math.floor(((longitude % 360) + 360) % 360 / 30)]!;
}

function degMinFromLongitude(longitude: number): { deg: number; min: number } {
  const inSign = ((longitude % 360) + 360) % 360 % 30;
  const deg = Math.floor(inSign);
  const min = Math.floor((inSign - deg) * 60);
  return { deg, min };
}

function findTransitAspect(natalLon: number, transitLon: number): CellAspect | null {
  let diff = Math.abs(natalLon - transitLon);
  if (diff > 180) diff = 360 - diff;
  for (const def of TRANSIT_ASPECT_DEFS) {
    if (Math.abs(diff - def.angle) <= def.orb) {
      return { type: def.type, orb: Math.abs(diff - def.angle) };
    }
  }
  return null;
}

const PTOLEMAIC_TYPES = new Set<AspectType>(['conjunction', 'opposition', 'trine', 'square', 'sextile']);

interface TransitAspectGridProps {
  chartData: ChartResult;
  transitData: TransitResult;
  ptolemaicOnly?: boolean | undefined;
}

const CELL_SIZE_DESKTOP = 34;
const CELL_SIZE_MOBILE = 28;

export const TransitAspectGrid: React.FC<TransitAspectGridProps> = ({ chartData, transitData, ptolemaicOnly = true }) => {
  const { isMobile } = useResponsive();
  const CELL_SIZE = isMobile ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP;
  // Build natal rows: all planets + ASC + MC
  const natalRows: NatalPoint[] = chartData.planets.map(p => ({
    key: p.planet,
    glyph: p.planet,
    longitude: p.longitude,
    sign: p.sign,
    degree: p.degree,
    minute: p.minute,
    isTextLabel: p.planet === 'vertex',
  }));
  // Add ASC and MC with computed sign/degree
  for (const [key, lon] of [['asc', chartData.angles.ascendant], ['mc', chartData.angles.midheaven]] as const) {
    const sign = signFromLongitude(lon);
    const { deg, min } = degMinFromLongitude(lon);
    natalRows.push({
      key,
      glyph: key === 'asc' ? 'AC' : 'MC',
      longitude: lon,
      sign,
      degree: deg,
      minute: min,
      isTextLabel: true,
    });
  }

  // Build transit columns: all transit planets
  const transitCols = transitData.planets;

  // Build aspect lookup from pre-computed transit aspects
  const aspectMap = new Map<string, CellAspect>();
  for (const a of transitData.aspects) {
    aspectMap.set(`${a.natalPlanet}|${a.transitPlanet}`, { type: a.type, orb: a.orb });
  }

  /** Get aspect between a natal point and transit planet */
  function getAspect(natalKey: string, transitKey: string, natalLon: number, transitLon: number): CellAspect | null {
    const existing = aspectMap.get(`${natalKey}|${transitKey}`);
    const result = existing ?? findTransitAspect(natalLon, transitLon);
    if (result && ptolemaicOnly && !PTOLEMAIC_TYPES.has(result.type)) return null;
    return result;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}
      >
        {/* Column headers: transit planet glyphs + sign/degree */}
        <thead>
          <tr>
            {/* Empty corner cell */}
            <th
              style={{
                width: '34px',
                border: '1px solid #d4c9a8',
                backgroundColor: '#f5f0e8',
                padding: 0,
              }}
            />
            {transitCols.map(col => (
              <th
                key={col.planet}
                style={{
                  width: `${CELL_SIZE}px`,
                  textAlign: 'center',
                  verticalAlign: 'bottom',
                  border: '1px solid #d4c9a8',
                  backgroundColor: '#f5f0e8',
                  padding: '3px 1px',
                  lineHeight: 1.1,
                }}
              >
                <span style={{ fontSize: '1rem', display: 'block', lineHeight: 1.2 }}>
                  <PlanetGlyphIcon planet={col.planet} size="1em" />
                </span>
                <span style={{ fontSize: '0.6rem', display: 'block', lineHeight: 1.3 }}>
                  <SignGlyphIcon sign={col.sign} size="0.9em" color={SIGN_ELEMENT_COLORS[col.sign] || '#5a4a3a'} />
                  {' '}{col.degree}°{col.minute.toString().padStart(2, '0')}′
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {natalRows.map(row => (
            <tr key={row.key}>
              {/* Row header: natal planet glyph + sign + degree */}
              <td
                style={{
                  height: `${CELL_SIZE}px`,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  backgroundColor: '#f5f0e8',
                  border: '1px solid #d4c9a8',
                  padding: '0 3px',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.isTextLabel || row.key === 'asc' || row.key === 'mc' ? (
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                    {row.key === 'asc' ? 'AC' : row.key === 'mc' ? 'MC' : row.key === 'vertex' ? 'Vx' : row.glyph}
                  </span>
                ) : (
                  <PlanetGlyphIcon planet={row.key} size="1em" />
                )}
              </td>
              {/* Aspect cells */}
              {transitCols.map(col => {
                const asp = getAspect(row.key, col.planet, row.longitude, col.longitude);
                return (
                  <td
                    key={col.planet}
                    style={{
                      width: `${CELL_SIZE}px`,
                      height: `${CELL_SIZE}px`,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      border: '1px solid #d4c9a8',
                      padding: 0,
                      fontSize: '0.65rem',
                      lineHeight: 1.1,
                      backgroundColor: asp ? '#fff' : '#faf7f0',
                    }}
                    title={asp ? `${asp.type} (${asp.orb.toFixed(1)}°)` : undefined}
                  >
                    {asp && (
                      <>
                        <span
                          className="glyph"
                          style={{
                            color: getAspectColor(asp.type),
                            fontSize: '0.9rem',
                            display: 'block',
                            lineHeight: 1,
                          }}
                        >
                          {getAspectGlyph(asp.type)}
                        </span>
                        <span style={{ color: '#888', fontSize: '0.55rem' }}>
                          {asp.orb.toFixed(1)}°
                        </span>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
