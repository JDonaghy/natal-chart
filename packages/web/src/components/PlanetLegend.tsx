import React from 'react';
import { ChartResult, TransitResult } from '@natal-chart/core';
import { getPlanetGlyph, getSignGlyph } from '../utils/chart-helpers';

const SIGN_ELEMENT_COLORS: Record<string, string> = {
  aries: '#CC3333', leo: '#CC3333', sagittarius: '#CC3333',
  taurus: '#338833', virgo: '#338833', capricorn: '#338833',
  gemini: '#CCAA00', libra: '#CCAA00', aquarius: '#CCAA00',
  cancer: '#3366CC', scorpio: '#3366CC', pisces: '#3366CC',
};

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
}

const GLYPH_FONT = "'DejaVuSans', sans-serif";

const cellStyle: React.CSSProperties = {
  padding: '0.15rem 0.3rem',
  whiteSpace: 'nowrap',
  fontSize: '0.82rem',
};

const headerStyle: React.CSSProperties = {
  margin: '0 0 0.3rem 0',
  fontSize: '0.9rem',
  borderBottom: '1px solid #b8860b',
  paddingBottom: '0.2rem',
  color: '#5a4a3a',
};

const SignDeg: React.FC<{ longitude: number }> = ({ longitude }) => {
  const sign = signFromLongitude(longitude);
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: GLYPH_FONT, color: SIGN_ELEMENT_COLORS[sign] || '#5a4a3a' }}>
        {getSignGlyph(sign)}
      </span>
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
}) => {
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
            <tr style={{ borderBottom: '1px solid #d4c9b0' }}>
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
                <tr key={natalPlanet.planet} style={{ borderBottom: '1px solid #ece5d8' }}>
                  {/* Planet glyph + name */}
                  <td style={{ ...cellStyle }}>
                    <span style={{ fontFamily: GLYPH_FONT, color: PLANET_COLOR_ORANGE, marginRight: '0.25rem' }}>
                      {getPlanetGlyph(natalPlanet.planet)}
                    </span>
                    <span style={{ color: '#5a4a3a' }}>{formatPlanetName(natalPlanet.planet)}</span>
                    {natalPlanet.retrograde && (
                      <span style={{ color: '#CC3333', fontSize: '0.7rem', marginLeft: '0.15rem' }}>R</span>
                    )}
                  </td>
                  {/* Birth position */}
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <SignDeg longitude={natalPlanet.longitude} />
                  </td>
                  {/* Transit position */}
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    {transitPlanet ? (
                      <>
                        <SignDeg longitude={transitPlanet.longitude} />
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
            <tr style={{ borderBottom: '1px solid #d4c9b0' }}>
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
              <tr key={label} style={{ borderBottom: '1px solid #ece5d8' }}>
                <td style={{ ...cellStyle, fontWeight: 'bold', color: '#5a4a3a' }}>{label}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  <SignDeg longitude={birthLong} />
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  {transitLong !== undefined ? (
                    <SignDeg longitude={transitLong} />
                  ) : (
                    <span style={{ color: '#ccc' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* House cusps (birth only, compact) */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.2rem' }}>
          <tbody>
            {chartData.houses.map((house) => {
              const transitHouse = transitData.houses?.find(
                (h) => h.house === house.house,
              );
              return (
                <tr key={house.house} style={{ borderBottom: '1px solid #ece5d8' }}>
                  <td style={{ ...cellStyle, color: '#888', width: '2rem' }}>{house.house}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <SignDeg longitude={house.longitude} />
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    {transitHouse ? (
                      <SignDeg longitude={transitHouse.longitude} />
                    ) : (
                      <span style={{ color: '#ccc' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
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
            <tr key={planet.planet} style={{ borderBottom: '1px solid #ece5d8' }}>
              <td style={{ ...cellStyle, fontFamily: GLYPH_FONT, color: PLANET_COLOR_ORANGE }}>
                {getPlanetGlyph(planet.planet)}
              </td>
              <td style={{ ...cellStyle, color: '#5a4a3a' }}>
                {formatPlanetName(planet.planet)}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>
                <SignDeg longitude={planet.longitude} />
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
            <tr key={label} style={{ borderBottom: '1px solid #ece5d8' }}>
              <td style={{ ...cellStyle, fontWeight: 'bold', color: '#5a4a3a' }}>{label}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>
                <SignDeg longitude={longitude} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {chartData.houses.map((house) => (
            <tr key={house.house} style={{ borderBottom: '1px solid #ece5d8' }}>
              <td style={{ ...cellStyle, color: '#888' }}>{house.house}:</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>
                <SignDeg longitude={house.longitude} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
