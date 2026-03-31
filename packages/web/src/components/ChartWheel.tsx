import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { ChartResult, TransitResult, calculateLots } from '@natal-chart/core';
import type { LotResult } from '@natal-chart/core';
import '../App.css';

// Unicode astrological glyphs — standard characters that render with Noto Sans Symbols
const ZODIAC_UNICODE = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const PLANET_UNICODE: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  northNode: '☊', chiron: '⚷', lilith: '⚸', fortune: '⊕', vertex: 'Vx',
};
const GLYPH_FONT = "'DejaVuSans', sans-serif";

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
  lilith: '#4A3728',  // dark brown
  fortune: '#B8860B', // goldenrod
  vertex: '#4A6B8A',  // slate blue
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

// Zodiac sign glyph colors by element
const SIGN_ELEMENT_COLORS = [
  '#CC3333', // 0 Aries - fire
  '#338833', // 1 Taurus - earth
  '#CCAA00', // 2 Gemini - air
  '#3366CC', // 3 Cancer - water
  '#CC3333', // 4 Leo - fire
  '#338833', // 5 Virgo - earth
  '#CCAA00', // 6 Libra - air
  '#3366CC', // 7 Scorpio - water
  '#CC3333', // 8 Sagittarius - fire
  '#338833', // 9 Capricorn - earth
  '#CCAA00', // 10 Aquarius - air
  '#3366CC', // 11 Pisces - water
];

interface ChartWheelProps {
  chartData: ChartResult;
  transitData?: TransitResult | undefined;
  showLots?: boolean;
  size?: number;
}

export interface ChartWheelHandle {
  getSvgElement: () => SVGElement | null;
}

export const ChartWheel = forwardRef<ChartWheelHandle, ChartWheelProps>(
  ({ chartData, transitData, showLots = true, size = 800 }: ChartWheelProps, ref: React.ForwardedRef<ChartWheelHandle>): React.JSX.Element => {
    const center = size / 2;
    const ascendant = chartData.angles.ascendant;
    const hasTransits = !!transitData;

    // Calculate Lot positions
    const lots: LotResult | null = React.useMemo(() => {
      if (!showLots) return null;
      const sun = chartData.planets.find(p => p.planet === 'sun');
      const moon = chartData.planets.find(p => p.planet === 'moon');
      if (!sun || !moon) return null;
      return calculateLots(
        chartData.angles.ascendant,
        sun.longitude,
        moon.longitude,
        chartData.angles.descendant,
      );
    }, [chartData, showLots]);

    // Ring radii (as fractions of size/2)
    // When transits active, shrink the inner chart to make room for an outer transit band
    const R = hasTransits ? {
      transitOuter: center * 0.98,     // outermost transit planet labels
      transitInner: center * 0.78,     // inner edge of transit band (tick base)
      outer: center * 0.76,            // outer edge of zodiac ring
      zodiacInner: center * 0.62,      // inner edge of zodiac ring
      planetOuter: center * 0.62,      // natal planet band outer
      planetInner: center * 0.32,      // natal planet band inner
      houseNumOuter: center * 0.32,
      houseNumInner: center * 0.26,
      houseInner: center * 0.0,
    } : {
      transitOuter: center * 0.95,
      transitInner: center * 0.95,
      outer: center * 0.95,
      zodiacInner: center * 0.76,
      planetOuter: center * 0.76,
      planetInner: center * 0.38,
      houseNumOuter: center * 0.38,
      houseNumInner: center * 0.30,
      houseInner: center * 0.0,
    };
    // Derived: tick zone on inner edge of merged ring, glyphs in outer portion
    const ringWidth = R.outer - R.zodiacInner;
    const tickEdge = R.zodiacInner + ringWidth * 0.37; // boundary between ticks and glyphs

    // Convert ecliptic longitude to angle in SVG coordinate system
    // ASC at 9 o'clock (180°), counter-clockwise
    const toAngle = (longitude: number): number => {
      return ((180 - longitude + ascendant) % 360 + 360) % 360;
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

      const minSeparation = 8; // minimum degrees between label positions
      const labelPositions = sorted.map(p => p.longitude);

      // Normalize angular difference to [-180, 180]
      const angleDiff = (a: number, b: number): number => {
        let d = b - a;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        return d;
      };

      // Iteratively push overlapping labels apart (more passes for convergence)
      for (let pass = 0; pass < 30; pass++) {
        let moved = false;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const diff = angleDiff(labelPositions[i]!, labelPositions[j]!);
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

      // Sort displaced labels by ecliptic degree order so radial stacking matches
      const layouts = sorted.map((planet, i) => ({
        planet,
        tickLongitude: planet.longitude,
        labelLongitude: labelPositions[i]!,
        color: PLANET_COLORS[planet.planet] || '#8B7355',
      }));
      layouts.sort((a, b) => {
        const da = angleDiff(a.tickLongitude, a.labelLongitude);
        const db = angleDiff(b.tickLongitude, b.labelLongitude);
        // If both displaced in same direction from their cluster, sort by degree
        if (Math.abs(da) > 1 || Math.abs(db) > 1) {
          return a.planet.longitude - b.planet.longitude;
        }
        return 0;
      });

      return layouts;
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

    // Collision avoidance for transit planet labels
    const transitLayouts = React.useMemo(() => {
      if (!transitData) return [];
      const sorted = [...transitData.planets].sort((a, b) => a.longitude - b.longitude);
      const n = sorted.length;
      if (n === 0) return [];

      const minSeparation = 8;
      const labelPositions = sorted.map(p => p.longitude);

      const angleDiff = (a: number, b: number): number => {
        let d = b - a;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        return d;
      };

      for (let pass = 0; pass < 30; pass++) {
        let moved = false;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const diff = angleDiff(labelPositions[i]!, labelPositions[j]!);
          const absDiff = Math.abs(diff);
          if (absDiff < minSeparation && absDiff > 0) {
            const push = (minSeparation - absDiff) / 2 * 0.6;
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
    }, [transitData]);

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
          <circle cx={center} cy={center} r={(hasTransits ? R.transitOuter : R.outer) + 4} fill="#f5f0e8" />

          {/* === ZODIAC SIGN SEGMENTS (alternating fills, merged ring) === */}
          {Array.from({ length: 12 }).map((_, i) => {
            const startLon = i * 30;
            const endLon = (i + 1) * 30;
            return (
              <path
                key={`sign-seg-${i}`}
                d={arcPath(startLon, endLon, R.outer, R.zodiacInner)}
                fill={SIGN_FILLS[i % 2]}
                stroke="#c4a96a"
                strokeWidth={0.5}
              />
            );
          })}

          {/* === TICK MARKS (inner edge, facing outward) === */}
          {Array.from({ length: 360 }).map((_, deg) => {
            // Sign boundaries at every 30°
            if (deg % 30 === 0) {
              const p1 = toPoint(deg, R.zodiacInner);
              const p2 = toPoint(deg, hasTransits ? R.transitOuter : R.outer + 2);
              return (
                <line
                  key={`bound-${deg}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke="#b8860b" strokeWidth={1.5}
                />
              );
            }
            // 5° ticks (from inner edge outward ~60% of tick zone)
            if (deg % 5 === 0) {
              const p1 = toPoint(deg, R.zodiacInner);
              const p2 = toPoint(deg, R.zodiacInner + (tickEdge - R.zodiacInner) * 0.6);
              return (
                <line
                  key={`tick5-${deg}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke="#c4a96a" strokeWidth={0.8}
                />
              );
            }
            // 1° ticks (from inner edge outward ~30% of tick zone)
            const p1 = toPoint(deg, R.zodiacInner);
            const p2 = toPoint(deg, R.zodiacInner + (tickEdge - R.zodiacInner) * 0.3);
            return (
              <line
                key={`tick1-${deg}`}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="#d4c5a0" strokeWidth={0.4}
              />
            );
          })}

          {/* === ZODIAC SIGN GLYPHS (Unicode text, colored by element) === */}
          {Array.from({ length: 12 }).map((_, i) => {
            const midLon = i * 30 + 15;
            const midR = (tickEdge + R.outer) / 2;
            const pos = toPoint(midLon, midR);
            const glyphSize = (R.outer - tickEdge) * 0.6;

            return (
              <text
                key={`sign-glyph-${i}`}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={glyphSize}
                fontFamily={GLYPH_FONT}
                fill={SIGN_ELEMENT_COLORS[i]}
                data-glyph="zodiac"
                data-glyph-index={i}
              >
                {ZODIAC_UNICODE[i]}
              </text>
            );
          })}

          {/* === STRUCTURAL CIRCLES === */}
          <circle cx={center} cy={center} r={R.outer} fill="none" stroke="#b8860b" strokeWidth={1.5} />
          <circle cx={center} cy={center} r={R.zodiacInner} fill="none" stroke="#b8860b" strokeWidth={1} />
          <circle cx={center} cy={center} r={R.houseNumOuter} fill="none" stroke="#b8860b" strokeWidth={1} />
          <circle cx={center} cy={center} r={R.houseNumInner} fill="url(#parchmentGradient)" stroke="#b8860b" strokeWidth={1} />

          {/* === HOUSE CUSP LINES (from outer circle to house number ring inner) === */}
          {chartData.houses.map((house) => {
            const isAngular = [1, 4, 7, 10].includes(house.house);
            const p1 = toPoint(house.longitude, hasTransits ? R.transitOuter : R.outer);
            const p2 = toPoint(house.longitude, R.houseNumInner);
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

          {/* === HOUSE NUMBERS (in dedicated house number ring) === */}
          {houseMiddles.map(({ house, longitude }) => {
            const pos = toPoint(longitude, (R.houseNumOuter + R.houseNumInner) / 2);
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

            const pos1 = toPoint(p1.longitude, R.houseNumInner * 0.92);
            const pos2 = toPoint(p2.longitude, R.houseNumInner * 0.92);
            const color = ASPECT_COLORS[aspect.type] || '#a09080';
            const isHard = ['opposition', 'square'].includes(aspect.type);

            return (
              <line
                key={`aspect-${index}`}
                x1={pos1.x} y1={pos1.y} x2={pos2.x} y2={pos2.y}
                stroke={color}
                strokeWidth={aspect.exact ? 1.5 : 0.8}
                strokeOpacity={aspect.exact ? 0.85 : 0.5}
                strokeDasharray={isHard ? 'none' : '4,3'}
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
            const bandH = R.planetOuter - R.planetInner;

            // Tick from zodiac inner edge into planet band
            const tickTop = toPoint(tickLongitude, R.zodiacInner);
            const tickBot = toPoint(tickLongitude, R.zodiacInner - bandH * 0.12);

            // Connector line from tick down to glyph (always shown)
            const glyphR = (R.planetOuter + R.planetInner) / 2 + bandH * 0.14;
            const connectorBot = toPoint(labelLongitude, glyphR + bandH * 0.08);

            // Glyph center
            const glyphPos = toPoint(labelLongitude, glyphR);
            const glyphSz = bandH * 0.22;

            // Degree + sign glyph label below planet glyph
            const degSignPos = toPoint(labelLongitude, glyphR - bandH * 0.22);
            // Minute label below degree
            const minPos = toPoint(labelLongitude, glyphR - bandH * 0.38);

            const signIndex = Math.floor(planet.longitude / 30) % 12;
            const signGlyph = ZODIAC_UNICODE[signIndex];
            const signColor = SIGN_ELEMENT_COLORS[signIndex];

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

                {/* Planet glyph (Unicode text) */}
                <text
                  x={glyphPos.x}
                  y={glyphPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={glyphSz}
                  fontFamily={GLYPH_FONT}
                  fill={color}
                  data-glyph="planet"
                  data-planet={planet.planet}
                >
                  {PLANET_UNICODE[planet.planet] || '○'}
                </text>

                {/* Retrograde indicator */}
                {planet.retrograde && (
                  <text
                    x={glyphPos.x + glyphSz * 0.6}
                    y={glyphPos.y - glyphSz * 0.4}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={size * 0.012} fill="#A0522D" fontStyle="italic"
                  >
                    R
                  </text>
                )}

                {/* Degree + sign glyph (e.g. "19° ♈") */}
                <text
                  x={degSignPos.x} y={degSignPos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={size * 0.014} fill="#5a4a3a"
                >
                  {planet.degree}°{' '}
                  <tspan fontFamily={GLYPH_FONT} fill={signColor} data-glyph="zodiac">{signGlyph}</tspan>
                </text>

                {/* Minute */}
                <text
                  x={minPos.x} y={minPos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={size * 0.012} fill="#5a4a3a"
                >
                  {planet.minute.toString().padStart(2, '0')}′
                </text>
              </g>
            );
          })}

          {/* === LOT POSITIONS (Fortune and Spirit) === */}
          {lots && (() => {
            const lotMarkers = [
              { name: 'Fortune', longitude: lots.fortune, glyph: '\u2295', color: '#b8860b' },
              { name: 'Spirit', longitude: lots.spirit, glyph: '\u2609', color: '#4A6B8A' },
            ];
            const lotR = (R.planetOuter + R.planetInner) / 2;
            const glyphSz = (R.planetOuter - R.planetInner) * 0.22;
            return lotMarkers.map(({ name, longitude, glyph, color }) => {
              const pos = toPoint(longitude, lotR);
              const tickTop = toPoint(longitude, R.zodiacInner);
              const tickBot = toPoint(longitude, R.zodiacInner - (R.planetOuter - R.planetInner) * 0.08);
              return (
                <g key={`lot-${name}`}>
                  <line
                    x1={tickTop.x} y1={tickTop.y} x2={tickBot.x} y2={tickBot.y}
                    stroke={color} strokeWidth={1.5} strokeDasharray="3,2"
                  />
                  <circle
                    cx={pos.x} cy={pos.y} r={glyphSz * 0.7}
                    fill="none" stroke={color} strokeWidth={1} opacity={0.5}
                  />
                  <text
                    x={pos.x} y={pos.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={glyphSz} fontFamily={GLYPH_FONT}
                    fill={color}
                  >
                    {glyph}
                  </text>
                </g>
              );
            });
          })()}

          {/* === TRANSIT OUTER RING (when active) === */}
          {hasTransits && transitData && (
            <>
              {/* Transit band boundary circles */}
              <circle cx={center} cy={center} r={R.transitOuter} fill="none" stroke="#b8860b" strokeWidth={1} />
              <circle cx={center} cy={center} r={R.transitInner} fill="none" stroke="#b8860b" strokeWidth={0.5} />

              {/* Transit planet glyphs with degree/sign/minute labels */}
              {transitLayouts.map((layout) => {
                const { planet, tickLongitude, labelLongitude, color } = layout;
                const bandWidth = R.transitOuter - R.transitInner;

                // Tick mark from outer edge of zodiac outward into transit band
                const tickBase = toPoint(tickLongitude, R.outer);
                const tickEnd = toPoint(tickLongitude, R.outer + bandWidth * 0.15);

                // Connector from tick to label position
                const glyphR = R.transitInner + bandWidth * 0.62;
                const connectorEnd = toPoint(labelLongitude, R.transitInner + bandWidth * 0.15);

                // Glyph center
                const glyphPos = toPoint(labelLongitude, glyphR);
                const glyphSz = bandWidth * 0.25;

                // Degree + sign glyph label (above glyph)
                const degSignPos = toPoint(labelLongitude, glyphR + bandWidth * 0.22);
                // Minute label (below glyph)
                const minPos = toPoint(labelLongitude, glyphR - bandWidth * 0.22);

                const signIndex = Math.floor(planet.longitude / 30) % 12;
                const signGlyph = ZODIAC_UNICODE[signIndex];
                const signColor = SIGN_ELEMENT_COLORS[signIndex];

                return (
                  <g key={`transit-${planet.planet}`}>
                    {/* Tick mark at true position */}
                    <line
                      x1={tickBase.x} y1={tickBase.y} x2={tickEnd.x} y2={tickEnd.y}
                      stroke={color} strokeWidth={2}
                    />

                    {/* Connector line from tick to label */}
                    <line
                      x1={tickEnd.x} y1={tickEnd.y}
                      x2={connectorEnd.x} y2={connectorEnd.y}
                      stroke={color} strokeWidth={0.6} strokeOpacity={0.5}
                    />

                    {/* Planet glyph */}
                    <text
                      x={glyphPos.x} y={glyphPos.y}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={glyphSz}
                      fontFamily={GLYPH_FONT}
                      fill={color}
                    >
                      {PLANET_UNICODE[planet.planet] || '○'}
                    </text>

                    {/* Retrograde indicator */}
                    {planet.retrograde && (
                      <text
                        x={glyphPos.x + glyphSz * 0.6}
                        y={glyphPos.y - glyphSz * 0.4}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={size * 0.010} fill="#A0522D" fontStyle="italic"
                      >
                        R
                      </text>
                    )}

                    {/* Degree + sign glyph (e.g. "19° ♈") */}
                    <text
                      x={degSignPos.x} y={degSignPos.y}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={size * 0.011} fill="#5a4a3a"
                    >
                      {planet.degree}°{' '}
                      <tspan fontFamily={GLYPH_FONT} fill={signColor} data-glyph="zodiac">{signGlyph}</tspan>
                    </text>

                    {/* Minute */}
                    <text
                      x={minPos.x} y={minPos.y}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={size * 0.010} fill="#5a4a3a"
                    >
                      {planet.minute.toString().padStart(2, '0')}′
                    </text>
                  </g>
                );
              })}

              {/* Transit aspect lines (natal-to-transit, dashed) */}
              {transitData.aspects.map((aspect, index) => {
                const natalP = chartData.planets.find(p => p.planet === aspect.natalPlanet);
                const transitP = transitData.planets.find(p => p.planet === aspect.transitPlanet);
                if (!natalP || !transitP) return null;

                const pos1 = toPoint(natalP.longitude, R.houseNumInner * 0.92);
                const pos2 = toPoint(transitP.longitude, R.houseNumInner * 0.92);
                const color = ASPECT_COLORS[aspect.type] || '#a09080';

                return (
                  <line
                    key={`transit-aspect-${index}`}
                    x1={pos1.x} y1={pos1.y} x2={pos2.x} y2={pos2.y}
                    stroke={color}
                    strokeWidth={aspect.exact ? 1.2 : 0.6}
                    strokeOpacity={aspect.exact ? 0.6 : 0.3}
                    strokeDasharray="2,4"
                  />
                );
              })}
            </>
          )}

          {/* Center dot */}
          <circle cx={center} cy={center} r={size * 0.006} fill="#b8860b" />
        </svg>
      </div>
    );
  },
);

