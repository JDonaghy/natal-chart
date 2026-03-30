import React from 'react';
import { ChartResult, TransitResult } from '@natal-chart/core';

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  northNode: '☊', chiron: '⚷',
};

const SIGN_GLYPHS: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
  leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
  sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const SIGN_ELEMENT_COLORS: Record<string, string> = {
  aries: '#CC3333', leo: '#CC3333', sagittarius: '#CC3333',
  taurus: '#338833', virgo: '#338833', capricorn: '#338833',
  gemini: '#CCAA00', libra: '#CCAA00', aquarius: '#CCAA00',
  cancer: '#3366CC', scorpio: '#3366CC', pisces: '#3366CC',
};

const PLANET_COLORS: Record<string, string> = {
  sun: '#DAA520', moon: '#8C8C8C', mercury: '#E0A030',
  venus: '#5BAF4E', mars: '#CC4422', jupiter: '#3D7AB8',
  saturn: '#888888', uranus: '#2DB5B5', neptune: '#4A6DD8',
  pluto: '#9055A2', northNode: '#8868B8', chiron: '#C08030',
};

function formatPlanetName(planet: string): string {
  if (planet === 'northNode') return 'North Node';
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

interface PlanetLegendProps {
  chartData: ChartResult;
  transitData?: TransitResult | undefined;
}

const GLYPH_FONT = "'DejaVuSans', sans-serif";

const cellStyle: React.CSSProperties = {
  padding: '0.2rem 0.4rem',
  whiteSpace: 'nowrap',
};

export const PlanetLegend: React.FC<PlanetLegendProps> = ({ chartData, transitData }) => {
  return (
    <div style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>
      {/* Planet Positions */}
      <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', borderBottom: '1px solid #b8860b', paddingBottom: '0.25rem' }}>
        Planet positions:
      </h4>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {chartData.planets.map((planet) => (
            <tr key={planet.planet} style={{ borderBottom: '1px solid #e8e0d0' }}>
              <td style={{ ...cellStyle, fontFamily: GLYPH_FONT, color: PLANET_COLORS[planet.planet] || '#5a4a3a' }}>
                {PLANET_GLYPHS[planet.planet] || '○'}
              </td>
              <td style={cellStyle}>
                {formatPlanetName(planet.planet)}
              </td>
              <td style={{ ...cellStyle, fontFamily: GLYPH_FONT, color: SIGN_ELEMENT_COLORS[planet.sign] || '#5a4a3a' }}>
                {SIGN_GLYPHS[planet.sign] || ''}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>
                {planet.degree}°{planet.minute.toString().padStart(2, '0')}′
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

      {/* Houses */}
      <h4 style={{ margin: '0.75rem 0 0.4rem 0', fontSize: '1rem', borderBottom: '1px solid #b8860b', paddingBottom: '0.25rem' }}>
        Houses:
      </h4>
      {/* Angles */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.25rem' }}>
        <tbody>
          {([
            ['AC:', chartData.angles.ascendant],
            ['DC:', chartData.angles.descendant],
            ['MC:', chartData.angles.midheaven],
            ['IC:', chartData.angles.imumCoeli],
          ] as [string, number][]).map(([label, longitude]) => {
            const sign = signFromLongitude(longitude);
            const { deg, min } = degMinFromLongitude(longitude);
            return (
              <tr key={label} style={{ borderBottom: '1px solid #e8e0d0' }}>
                <td style={{ ...cellStyle, fontWeight: 'bold' }}>{label}</td>
                <td style={{ ...cellStyle, fontFamily: GLYPH_FONT, color: SIGN_ELEMENT_COLORS[sign] || '#5a4a3a' }}>
                  {SIGN_GLYPHS[sign] || ''}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  {deg}°{min.toString().padStart(2, '0')}′
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* House cusps */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {chartData.houses.map((house) => {
            const sign = signFromLongitude(house.longitude);
            const { deg, min } = degMinFromLongitude(house.longitude);
            return (
              <tr key={house.house} style={{ borderBottom: '1px solid #e8e0d0' }}>
                <td style={{ ...cellStyle, color: '#888' }}>{house.house}:</td>
                <td style={{ ...cellStyle, fontFamily: GLYPH_FONT, color: SIGN_ELEMENT_COLORS[sign] || '#5a4a3a' }}>
                  {SIGN_GLYPHS[sign] || ''}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  {deg}°{min.toString().padStart(2, '0')}′
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Transit Positions */}
      {transitData && (
        <>
          <h4 style={{ margin: '0.75rem 0 0.4rem 0', fontSize: '1rem', borderBottom: '1px solid #4A6B8A', paddingBottom: '0.25rem' }}>
            Transit positions ({new Date(transitData.dateTimeUtc).toLocaleDateString()}):
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {transitData.planets.map((planet) => (
                <tr key={planet.planet} style={{ borderBottom: '1px solid #e8e0d0' }}>
                  <td style={{ ...cellStyle, fontFamily: GLYPH_FONT, color: PLANET_COLORS[planet.planet] || '#5a4a3a', opacity: 0.8 }}>
                    {PLANET_GLYPHS[planet.planet] || '○'}
                  </td>
                  <td style={{ ...cellStyle, opacity: 0.8 }}>
                    {formatPlanetName(planet.planet)}
                  </td>
                  <td style={{ ...cellStyle, fontFamily: GLYPH_FONT, color: SIGN_ELEMENT_COLORS[planet.sign] || '#5a4a3a', opacity: 0.8 }}>
                    {SIGN_GLYPHS[planet.sign] || ''}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right', opacity: 0.8 }}>
                    {planet.degree}°{planet.minute.toString().padStart(2, '0')}′
                  </td>
                  {transitData.houses && (
                    <td style={{ ...cellStyle, textAlign: 'right', color: '#888', opacity: 0.8 }}>
                      {planet.house || ''}
                    </td>
                  )}
                  <td style={{ ...cellStyle, color: '#CC3333', textAlign: 'center', opacity: 0.8 }}>
                    {planet.retrograde ? 'R' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};
