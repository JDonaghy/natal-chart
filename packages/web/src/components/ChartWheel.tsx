import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { ChartResult } from '@natal-chart/core';
import { getPlanetPath, getSignPathByIndex, SIGN_ABBREVIATIONS } from '../utils/astro-glyph-paths';
import '../App.css';

// Planet colors (traditional astrology associations)
const PLANET_COLORS: Record<string, string> = {
  sun: '#DAA520',     // goldenrod
  moon: '#8C8C8C',    // silver
  mercury: '#E0A030',  // bright amber
  venus: '#5BAF4E',   // green
  mars: '#CC4422',    // bright red-brown
  jupiter: '#3D7AB8', // bright blue
  saturn: '#888888',  // medium gray
  uranus: '#2DB5B5',  // bright teal
  neptune: '#4A6DD8', // bright blue
  pluto: '#9055A2',   // bright purple
  northNode: '#8868B8', // bright lavender
  chiron: '#C08030',  // bright bronze
};

// Aspect colors — warm palette
const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#C08030',
  opposition: '#CC4422',
  trine: '#3D7AB8',
  square: '#CC4422',
  sextile: '#3D7AB8',
  quincunx: '#8868B8',
  semiSextile: '#8868B8',
};

// Alternating zodiac sign segment fills
const SIGN_FILLS = [
  '#faf7f0', '#f3ece0', // fire/earth alternation
];

interface ChartWheelProps {
  chartData: ChartResult;
  size?: number;
}

export interface ChartWheelHandle {
  getSvgElement: () => SVGElement | null;
}

export const ChartWheel = forwardRef<ChartWheelHandle, ChartWheelProps>(
  ({ chartData, size = 800 }: ChartWheelProps, ref: React.ForwardedRef<ChartWheelHandle>): React.JSX.Element => {
    const center = size / 2;
    const ascendant = chartData.angles.ascendant;

    // Ring radii (as fractions of size/2)
    const R = {
      outer: center * 0.95,        // outermost edge
      tickOuter: center * 0.95,    // tick marks outer
      tickInner: center * 0.88,    // tick marks inner / zodiac sign band outer
      zodiacOuter: center * 0.88,  // zodiac sign glyphs band outer
      zodiacInner: center * 0.76,  // zodiac sign glyphs band inner
      planetOuter: center * 0.76,  // planet band outer
      planetInner: center * 0.40,  // planet band inner / house wheel outer
      houseInner: center * 0.0,    // center
    };

    // Convert ecliptic longitude to angle in SVG coordinate system
    // ASC at 9 o'clock (180°), counter-clockwise
    const toAngle = (longitude: number): number => {
      return (180 - longitude + ascendant) % 360;
    };

    const toRad = (angleDeg: number): number => angleDeg * (Math.PI / 180);

    // Convert longitude to SVG point at given radius
    const toPoint = (longitude: number, r: number): { x: number; y: number } => {
      const rad = toRad(toAngle(longitude));
      return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
    };

    // Create SVG arc path between two angles at a given radius
    const arcPath = (startLon: number, endLon: number, rOuter: number, rInner: number): string => {
      const a1 = toRad(toAngle(startLon));
      const a2 = toRad(toAngle(endLon));

      const x1o = center + rOuter * Math.cos(a1);
      const y1o = center + rOuter * Math.sin(a1);
      const x2o = center + rOuter * Math.cos(a2);
      const y2o = center + rOuter * Math.sin(a2);
      const x1i = center + rInner * Math.cos(a1);
      const y1i = center + rInner * Math.sin(a1);
      const x2i = center + rInner * Math.cos(a2);
      const y2i = center + rInner * Math.sin(a2);

      // Arc sweeps clockwise in SVG (our angles go counter-clockwise for longitude)
      return [
        `M ${x1o} ${y1o}`,
        `A ${rOuter} ${rOuter} 0 0 0 ${x2o} ${y2o}`,
        `L ${x2i} ${y2i}`,
        `A ${rInner} ${rInner} 0 0 1 ${x1i} ${y1i}`,
        'Z',
      ].join(' ');
    };

    // Collision avoidance for planet labels in the planet band
    const planetLayouts = React.useMemo(() => {
      const sorted = [...chartData.planets].sort((a, b) => a.longitude - b.longitude);
      const n = sorted.length;
      if (n === 0) return [];

      const minSeparation = 10; // minimum degrees between label positions
      const labelPositions = sorted.map(p => p.longitude);

      // Normalize angular difference to [-180, 180]
      const angleDiff = (a: number, b: number): number => {
        let d = b - a;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        return d;
      };

      // Iteratively push overlapping labels apart (more passes for convergence)
      for (let pass = 0; pass < 20; pass++) {
        let moved = false;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const diff = angleDiff(labelPositions[i]!, labelPositions[j]!);
          // Only push apart if they're close in the positive (sorted) direction
          // For the wrap-around pair (last→first), diff will be large positive (~360-ish via modular)
          const absDiff = Math.abs(diff);
          if (absDiff < minSeparation && absDiff > 0) {
            const push = (minSeparation - absDiff) / 2 * 0.6; // damped push
            const sign = diff > 0 ? 1 : -1;
            labelPositions[i] = (labelPositions[i]! - sign * push + 360) % 360;
            labelPositions[j] = (labelPositions[j]! + sign * push + 360) % 360;
            moved = true;
          }
        }
        if (!moved) break;
      }

      return sorted.map((planet, i) => ({
        planet,
        tickLongitude: planet.longitude,
        labelLongitude: labelPositions[i]!,
        color: PLANET_COLORS[planet.planet] || '#8B7355',
      }));
    }, [chartData.planets]);

    // House number positions: midpoint of each house arc
    const houseMiddles = React.useMemo(() => {
      return chartData.houses.map((house, i) => {
        const nextHouse = chartData.houses[(i + 1) % 12]!;
        let mid = (house.longitude + nextHouse.longitude) / 2;
        // Handle wrap-around
        if (nextHouse.longitude < house.longitude) {
          mid = (house.longitude + nextHouse.longitude + 360) / 2;
          if (mid >= 360) mid -= 360;
        }
        return { house: house.house, longitude: mid };
      });
    }, [chartData.houses]);

    const svgRef = useRef<SVGSVGElement>(null);

    useImperativeHandle(ref, () => ({
      getSvgElement: () => svgRef.current,
    }));

    return (
      <div style={{ width: '100%', aspectRatio: '1 / 1', maxWidth: `${size}px`, margin: '0 auto' }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${size} ${size}`}
          style={{ fontFamily: '"Cormorant", "Crimson Text", serif' }}
        >
          <defs>
            <radialGradient id="parchmentGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#faf7f0" />
              <stop offset="100%" stopColor="#f0ead6" />
            </radialGradient>
            <filter id="subtleShadow" x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
              <feOffset in="blur" dx="1" dy="1" result="offsetBlur" />
              <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
            </filter>
          </defs>

          {/* === BACKGROUND === */}
          <circle cx={center} cy={center} r={R.outer + 4} fill="#f5f0e8" />

          {/* === ZODIAC SIGN SEGMENTS (alternating fills) === */}
          {Array.from({ length: 12 }).map((_, i) => {
            const startLon = i * 30;
            const endLon = (i + 1) * 30;
            return (
              <path
                key={`sign-seg-${i}`}
                d={arcPath(startLon, endLon, R.zodiacOuter, R.zodiacInner)}
                fill={SIGN_FILLS[i % 2]}
                stroke="#c4a96a"
                strokeWidth={0.5}
              />
            );
          })}

          {/* === TICK MARK RING (outer edge) === */}
          {Array.from({ length: 360 }).map((_, deg) => {
            // Sign boundaries at every 30°
            if (deg % 30 === 0) {
              const p1 = toPoint(deg, R.tickOuter + 2);
              const p2 = toPoint(deg, R.zodiacInner);
              return (
                <line
                  key={`bound-${deg}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke="#b8860b" strokeWidth={1.5}
                />
              );
            }
            // 5° ticks
            if (deg % 5 === 0) {
              const p1 = toPoint(deg, R.tickOuter);
              const p2 = toPoint(deg, R.tickInner + (R.tickOuter - R.tickInner) * 0.4);
              return (
                <line
                  key={`tick5-${deg}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke="#c4a96a" strokeWidth={0.8}
                />
              );
            }
            // 1° ticks
            const p1 = toPoint(deg, R.tickOuter);
            const p2 = toPoint(deg, R.tickInner + (R.tickOuter - R.tickInner) * 0.7);
            return (
              <line
                key={`tick1-${deg}`}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="#d4c5a0" strokeWidth={0.4}
              />
            );
          })}

          {/* === ZODIAC SIGN GLYPHS === */}
          {Array.from({ length: 12 }).map((_, i) => {
            const midLon = i * 30 + 15;
            const midR = (R.zodiacOuter + R.zodiacInner) / 2;
            const pos = toPoint(midLon, midR);
            const signPath = getSignPathByIndex(i);
            if (!signPath) return null;
            const glyphSize = (R.zodiacOuter - R.zodiacInner) * 0.55;

            return (
              <path
                key={`sign-glyph-${i}`}
                d={signPath.d}
                transform={`translate(${pos.x - glyphSize / 2}, ${pos.y - glyphSize / 2}) scale(${glyphSize / 100})`}
                fill="none"
                stroke="#5a4a3a"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* === STRUCTURAL CIRCLES === */}
          <circle cx={center} cy={center} r={R.outer} fill="none" stroke="#b8860b" strokeWidth={1.5} />
          <circle cx={center} cy={center} r={R.tickInner} fill="none" stroke="#b8860b" strokeWidth={0.8} />
          <circle cx={center} cy={center} r={R.zodiacInner} fill="none" stroke="#b8860b" strokeWidth={1} />
          <circle cx={center} cy={center} r={R.planetInner} fill="url(#parchmentGradient)" stroke="#b8860b" strokeWidth={1} />

          {/* === HOUSE CUSP LINES (inside the house wheel) === */}
          {chartData.houses.map((house) => {
            const isAngular = [1, 4, 7, 10].includes(house.house);
            const outerR = isAngular ? R.planetOuter : R.planetInner;
            const p1 = toPoint(house.longitude, outerR);
            const p2 = toPoint(house.longitude, R.houseInner);
            return (
              <line
                key={`house-line-${house.house}`}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={isAngular ? '#8B7355' : '#c4a96a'}
                strokeWidth={isAngular ? 1.5 : 0.7}
                strokeOpacity={isAngular ? 1 : 0.7}
              />
            );
          })}

          {/* === HOUSE NUMBERS (centered in each house wedge) === */}
          {houseMiddles.map(({ house, longitude }) => {
            const pos = toPoint(longitude, R.planetInner * 0.55);
            return (
              <text
                key={`house-num-${house}`}
                x={pos.x} y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.022}
                fill="#a09080"
                fontWeight="500"
              >
                {house}
              </text>
            );
          })}

          {/* === ASPECT LINES (inside the house wheel) === */}
          {chartData.aspects.map((aspect, index) => {
            const p1 = chartData.planets.find(p => p.planet === aspect.planet1);
            const p2 = chartData.planets.find(p => p.planet === aspect.planet2);
            if (!p1 || !p2) return null;

            const pos1 = toPoint(p1.longitude, R.planetInner * 0.92);
            const pos2 = toPoint(p2.longitude, R.planetInner * 0.92);
            const color = ASPECT_COLORS[aspect.type] || '#a09080';
            const isHard = ['opposition', 'square'].includes(aspect.type);

            return (
              <line
                key={`aspect-${index}`}
                x1={pos1.x} y1={pos1.y} x2={pos2.x} y2={pos2.y}
                stroke={color}
                strokeWidth={aspect.exact ? 1.2 : 0.6}
                strokeOpacity={aspect.exact ? 0.7 : 0.35}
                strokeDasharray={isHard ? 'none' : '3,2'}
              />
            );
          })}

          {/* === ANGULAR AXES (ASC-DSC, MC-IC as full-diameter lines) === */}
          {/* ASC — DSC axis */}
          {(() => {
            const ascOuter = toPoint(chartData.angles.ascendant, R.planetOuter);
            const dscOuter = toPoint(chartData.angles.descendant, R.planetOuter);
            const ascLabel = toPoint(chartData.angles.ascendant, R.planetOuter + size * 0.02);
            const dscLabel = toPoint(chartData.angles.descendant, R.planetOuter + size * 0.02);
            return (
              <g>
                <line
                  x1={ascOuter.x} y1={ascOuter.y}
                  x2={dscOuter.x} y2={dscOuter.y}
                  stroke="#8B4513" strokeWidth={2}
                />
                <text
                  x={ascLabel.x} y={ascLabel.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={size * 0.022} fill="#8B4513" fontWeight="bold"
                >
                  ASC
                </text>
                <text
                  x={dscLabel.x} y={dscLabel.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={size * 0.018} fill="#a08060" fontWeight="500"
                >
                  DSC
                </text>
              </g>
            );
          })()}

          {/* MC — IC axis */}
          {(() => {
            const mcOuter = toPoint(chartData.angles.midheaven, R.planetOuter);
            const icOuter = toPoint(chartData.angles.imumCoeli, R.planetOuter);
            const mcLabel = toPoint(chartData.angles.midheaven, R.planetOuter + size * 0.02);
            const icLabel = toPoint(chartData.angles.imumCoeli, R.planetOuter + size * 0.02);
            return (
              <g>
                <line
                  x1={mcOuter.x} y1={mcOuter.y}
                  x2={icOuter.x} y2={icOuter.y}
                  stroke="#4A6B8A" strokeWidth={2}
                />
                <text
                  x={mcLabel.x} y={mcLabel.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={size * 0.022} fill="#4A6B8A" fontWeight="bold"
                >
                  MC
                </text>
                <text
                  x={icLabel.x} y={icLabel.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={size * 0.018} fill="#7A9AB0" fontWeight="500"
                >
                  IC
                </text>
              </g>
            );
          })()}

          {/* === PLANET BAND: glyphs, ticks, degree/sign/minute info === */}
          {planetLayouts.map((layout) => {
            const { planet, tickLongitude, labelLongitude, color } = layout;

            // Tick from zodiac inner edge into planet band
            const tickTop = toPoint(tickLongitude, R.zodiacInner);
            const tickBot = toPoint(tickLongitude, R.zodiacInner - (R.planetOuter - R.planetInner) * 0.12);

            // Connector line from tick down to glyph (always shown)
            const glyphR = (R.planetOuter + R.planetInner) / 2 + (R.planetOuter - R.planetInner) * 0.12;
            const connectorBot = toPoint(labelLongitude, glyphR + (R.planetOuter - R.planetInner) * 0.1);

            // Glyph center
            const glyphPos = toPoint(labelLongitude, glyphR);
            const glyphSz = (R.planetOuter - R.planetInner) * 0.28;

            // Degree and minute labels below glyph
            const degPos = toPoint(labelLongitude, glyphR - (R.planetOuter - R.planetInner) * 0.22);
            const signPos = toPoint(labelLongitude, glyphR - (R.planetOuter - R.planetInner) * 0.38);
            const minPos = toPoint(labelLongitude, glyphR - (R.planetOuter - R.planetInner) * 0.52);

            return (
              <g key={planet.planet}>
                {/* Tick mark at true position */}
                <line
                  x1={tickTop.x} y1={tickTop.y} x2={tickBot.x} y2={tickBot.y}
                  stroke={color} strokeWidth={2}
                />

                {/* Connector line from tick to glyph */}
                <line
                  x1={tickBot.x} y1={tickBot.y}
                  x2={connectorBot.x} y2={connectorBot.y}
                  stroke={color} strokeWidth={0.6} strokeOpacity={0.5}
                />

                {/* Planet glyph */}
                {(() => {
                  const planetPath = getPlanetPath(planet.planet);
                  if (!planetPath) return null;
                  return (
                    <path
                      d={planetPath.d}
                      transform={`translate(${glyphPos.x - glyphSz / 2}, ${glyphPos.y - glyphSz / 2}) scale(${glyphSz / 100})`}
                      fill="none"
                      stroke={color}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })()}

                {/* Retrograde indicator */}
                {planet.retrograde && (
                  <text
                    x={glyphPos.x + glyphSz * 0.6}
                    y={glyphPos.y - glyphSz * 0.4}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={size * 0.014} fill="#A0522D" fontStyle="italic"
                  >
                    R
                  </text>
                )}

                {/* Degree */}
                <text
                  x={degPos.x} y={degPos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={size * 0.016} fill="#5a4a3a"
                >
                  {planet.degree}°
                </text>

                {/* Sign abbreviation */}
                <text
                  x={signPos.x} y={signPos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={size * 0.013} fill="#8a7a6a"
                >
                  {SIGN_ABBREVIATIONS[Math.floor(planet.longitude / 30) % 12]}
                </text>

                {/* Minute */}
                <text
                  x={minPos.x} y={minPos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={size * 0.014} fill="#5a4a3a"
                >
                  {planet.minute.toString().padStart(2, '0')}′
                </text>
              </g>
            );
          })}

          {/* === HOUSE CUSP DEGREES (in planet band, near cusp lines) === */}
          {chartData.houses.map((house) => {
            // Place degree label just inside the planet band, offset from cusp line
            const labelR = R.planetInner + (R.planetOuter - R.planetInner) * 0.12;
            // Offset a few degrees so it doesn't sit right on the line
            const offsetLon = (house.longitude + 3) % 360;
            const pos = toPoint(offsetLon, labelR);
            return (
              <text
                key={`cusp-deg-${house.house}`}
                x={pos.x} y={pos.y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={size * 0.012} fill="#a09080"
              >
                {formatLongitude(house.longitude)}
              </text>
            );
          })}

          {/* Center dot */}
          <circle cx={center} cy={center} r={size * 0.006} fill="#b8860b" />
        </svg>
      </div>
    );
  },
);

// Helper functions
function getSignIndex(longitude: number): number {
  return Math.floor(longitude / 30) % 12;
}

function getDegreeInSign(longitude: number): number {
  return longitude % 30;
}

function formatLongitude(longitude: number): string {
  const signIndex = getSignIndex(longitude);
  const degree = Math.floor(getDegreeInSign(longitude));
  const minute = Math.round((getDegreeInSign(longitude) - degree) * 60);
  const adjustedDegree = minute === 60 ? degree + 1 : degree;
  const adjustedMinute = minute === 60 ? 0 : minute;
  const signAbbr = SIGN_ABBREVIATIONS[signIndex] || '???';
  const minuteStr = adjustedMinute.toString().padStart(2, '0');
  return `${adjustedDegree}° ${signAbbr} ${minuteStr}′`;
}
