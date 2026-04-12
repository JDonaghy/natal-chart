import React from 'react';
import { ChartResult, TransitResult } from '@natal-chart/core';
import { PlanetGlyphIcon, SignGlyphIcon } from './GlyphIcon';
import { type ThemeColors, signColorMap, resolveTheme, DEFAULT_THEME_PREFERENCE } from '../utils/themes';

const PLANET_COLOR_ORANGE = '#D4761C';

function formatPlanetName(planet: string): string {
  if (planet === 'northNode') return 'Node';
  if (planet === 'fortune') return 'Fortune';
  if (planet === 'vertex') return 'Vertex';
  return planet.charAt(0).toUpperCase() + planet.slice(1);
}

function signFromLongitude(longitude: number): string {
  const signs = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];
  return signs[Math.floor(longitude / 30) % 12]!;
}

function degMinFromLongitude(longitude: number): { deg: number; min: number } {
  const inSign = longitude % 30;
  const deg = Math.floor(inSign);
  const min = Math.floor((inSign - deg) * 60);
  return { deg, min };
}

function formatDegMin(longitude: number): string {
  const { deg, min } = degMinFromLongitude(longitude);
  return `${deg}°${min.toString().padStart(2, '0')}′`;
}

interface PlanetLegendProps {
  chartData: ChartResult;
  transitData?: TransitResult | undefined;
  birthDateLabel?: string | undefined;
  transitDateLabel?: string | undefined;
  theme?: ThemeColors | undefined;
}



const cellStyle: React.CSSProperties = {
  padding: '0.15rem 0.3rem',
  whiteSpace: 'nowrap',
  fontSize: '0.82rem',
};

const headerStyle: React.CSSProperties = {
  margin: '0 0 0.3rem 0',
  fontSize: '0.9rem',
  borderBottom: '1px solid var(--gold)',
  paddingBottom: '0.2rem',
  color: 'var(--dark-blue)',
};

const DEFAULT_THEME = resolveTheme(DEFAULT_THEME_PREFERENCE);

const SignDeg: React.FC<{ longitude: number; elementColorMap?: Record<string, string> }> = ({ longitude, elementColorMap }) => {
  const sign = signFromLongitude(longitude);
  const colors = elementColorMap || signColorMap(DEFAULT_THEME);
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <SignGlyphIcon sign={sign} color={colors[sign] || 'var(--dark-blue)'} />
      {' '}
      <span>{formatDegMin(longitude)}</span>
    </span>
  );
};

export const PlanetLegend: React.FC<PlanetLegendProps> = ({
  chartData,
  transitData,
  birthDateLabel,
  transitDateLabel,
  theme: themeProp,
}) => {
  const th = themeProp || DEFAULT_THEME;
  const elementColorMap = React.useMemo(() => signColorMap(th), [th]);
  const borderLight = `1px solid ${th.accent}33`;  // accent at ~20% opacity
  const borderMed = `1px solid ${th.accent}66`;    // accent at ~40% opacity
  const isTransit = !!transitData;
  const houseSystemLabel = 'Placidus';

  if (isTransit) {
    return (
      <div style={{ fontSize: '0.82rem', lineHeight: 1.35 }}>
        {/* Header: Birth x Transits */}
        <div style={{
          ...headerStyle,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontSize: '0.85rem',
          fontWeight: 'bold',
        }}>
          <span>Birth</span>
          <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'normal' }}>×</span>
          <span>Transits</span>
        </div>
        {(birthDateLabel || transitDateLabel) && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#888',
            marginBottom: '0.3rem',
          }}>
            <span>{birthDateLabel || ''}</span>
            <span>{transitDateLabel || ''}</span>
          </div>
        )}

        {/* Planet table: Planet | Birth | Transit */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: borderMed }}>
              <th style={{ ...cellStyle, textAlign: 'left', fontWeight: 'normal', color: '#888', fontSize: '0.72rem' }}>Planet</th>
              <th style={{ ...cellStyle, textAlign: 'right', fontWeight: 'normal', color: '#888', fontSize: '0.72rem' }}>Birth</th>
              <th style={{ ...cellStyle, textAlign: 'right', fontWeight: 'normal', color: '#888', fontSize: '0.72rem' }}>Transit</th>
            </tr>
          </thead>
          <tbody>
            {chartData.planets.map((natalPlanet) => {
              const transitPlanet = transitData.planets.find(
                (tp) => tp.planet === natalPlanet.planet,
              );
              return (
                <tr key={natalPlanet.planet} style={{ borderBottom: borderLight }}>
                  {/* Planet glyph + name */}
                  <td style={{ ...cellStyle }}>
                    <PlanetGlyphIcon planet={natalPlanet.planet} color={PLANET_COLOR_ORANGE} style={{ marginRight: '0.25rem' }} />
                    <span style={{ color: th.text }}>{formatPlanetName(natalPlanet.planet)}</span>
                    {natalPlanet.retrograde && (
                      <span style={{ color: '#CC3333', fontSize: '0.7rem', marginLeft: '0.15rem' }}>R</span>
                    )}
                  </td>
                  {/* Birth position */}
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <SignDeg elementColorMap={elementColorMap} longitude={natalPlanet.longitude} />
                  </td>
                  {/* Transit position */}
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    {transitPlanet ? (
                      <>
                        <SignDeg elementColorMap={elementColorMap} longitude={transitPlanet.longitude} />
                        {transitPlanet.retrograde && (
                          <span style={{ color: '#CC3333', fontSize: '0.7rem', marginLeft: '0.15rem' }}>R</span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#ccc' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Houses: angles with birth + transit */}
        <h4 style={{ ...headerStyle, marginTop: '0.5rem' }}>
          Houses <span style={{ fontWeight: 'normal', fontSize: '0.72rem', color: '#888' }}>({houseSystemLabel})</span>
        </h4>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: borderMed }}>
              <th style={{ ...cellStyle, textAlign: 'left', fontWeight: 'normal', color: '#888', fontSize: '0.72rem' }}></th>
              <th style={{ ...cellStyle, textAlign: 'right', fontWeight: 'normal', color: '#888', fontSize: '0.72rem' }}>Birth</th>
              <th style={{ ...cellStyle, textAlign: 'right', fontWeight: 'normal', color: '#888', fontSize: '0.72rem' }}>Transit</th>
            </tr>
          </thead>
          <tbody>
            {([
              ['ASC', chartData.angles.ascendant, transitData.angles?.ascendant],
              ['IC', chartData.angles.imumCoeli, transitData.angles?.imumCoeli],
              ['DSC', chartData.angles.descendant, transitData.angles?.descendant],
              ['MC', chartData.angles.midheaven, transitData.angles?.midheaven],
            ] as [string, number, number | undefined][]).map(([label, birthLong, transitLong]) => (
              <tr key={label} style={{ borderBottom: borderLight }}>
                <td style={{ ...cellStyle, fontWeight: 'bold', color: th.text }}>{label}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  <SignDeg elementColorMap={elementColorMap} longitude={birthLong} />
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  {transitLong !== undefined ? (
                    <SignDeg elementColorMap={elementColorMap} longitude={transitLong} />
                  ) : (
                    <span style={{ color: '#ccc' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    );
  }

  // --- Natal-only mode (no transit data) ---
  return (
    <div style={{ fontSize: '0.82rem', lineHeight: 1.35 }}>
      <h4 style={headerStyle}>Planet positions:</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {chartData.planets.map((planet) => (
            <tr key={planet.planet} style={{ borderBottom: borderLight }}>
              <td style={{ ...cellStyle }}>
                <PlanetGlyphIcon planet={planet.planet} color={PLANET_COLOR_ORANGE} />
              </td>
              <td style={{ ...cellStyle, color: th.text }}>
                {formatPlanetName(planet.planet)}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>
                <SignDeg elementColorMap={elementColorMap} longitude={planet.longitude} />
              </td>
              <td style={{ ...cellStyle, textAlign: 'right', color: '#888' }}>
                {planet.house}
              </td>
              <td style={{ ...cellStyle, color: '#CC3333', textAlign: 'center' }}>
                {planet.retrograde ? 'R' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 style={{ ...headerStyle, marginTop: '0.5rem' }}>
        Houses <span style={{ fontWeight: 'normal', fontSize: '0.72rem', color: '#888' }}>({houseSystemLabel})</span>
      </h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.25rem' }}>
        <tbody>
          {([
            ['ASC', chartData.angles.ascendant],
            ['IC', chartData.angles.imumCoeli],
            ['DSC', chartData.angles.descendant],
            ['MC', chartData.angles.midheaven],
          ] as [string, number][]).map(([label, longitude]) => (
            <tr key={label} style={{ borderBottom: borderLight }}>
              <td style={{ ...cellStyle, fontWeight: 'bold', color: th.text }}>{label}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>
                <SignDeg elementColorMap={elementColorMap} longitude={longitude} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
};
