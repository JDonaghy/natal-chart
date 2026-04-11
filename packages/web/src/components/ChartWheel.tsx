import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { ChartResult, TransitResult } from '@natal-chart/core';
import { getPlanetPath, getSignPathByIndex, glyphTransform, DEFAULT_GLYPH_SET } from '../utils/astro-glyph-paths';
import { type ThemeColors, resolveTheme, signElementColors, DEFAULT_THEME_PREFERENCE } from '../utils/themes';
import '../App.css';

// Unicode astrological glyphs — fallback for glyphs without SVG path data
const ZODIAC_UNICODE = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const PLANET_UNICODE: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '⯓',
  northNode: '☊', chiron: '⚷', lilith: '⚸', fortune: '⊕', spirit: '☩', vertex: 'Vx',
};
const GLYPH_FONT = "'DejaVuSans', sans-serif";
const LABEL_FONT = "'Cormorant', serif";

/** Render a planet glyph as an SVG <path> (font-independent), falling back to <text> */
function PlanetGlyph({ planet, x, y, sz, fill, rotate, opacity, glyphSet = DEFAULT_GLYPH_SET, overrides }: {
  planet: string; x: number; y: number; sz: number; fill: string;
  rotate?: number | undefined; opacity?: number | undefined;
  glyphSet?: string; overrides?: Record<string, string> | undefined;
}): React.ReactElement {
  const pathData = getPlanetPath(planet, glyphSet, overrides);
  if (pathData) {
    const t = glyphTransform(pathData.viewBox, x, y, sz);
    const fullT = rotate ? `rotate(${rotate} ${x} ${y}) ${t}` : t;
    return <path d={pathData.d} fill={fill} transform={fullT} fillOpacity={opacity} />;
  }
  // Fallback to text for glyphs without path data (lilith, fortune, vertex)
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      fontSize={sz} fontFamily={GLYPH_FONT} fill={fill} fillOpacity={opacity}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}>
      {PLANET_UNICODE[planet] || '○'}
    </text>
  );
}

/** Render a zodiac sign glyph as an SVG <path>, falling back to <text> */
function SignGlyph({ index, x, y, sz, fill, glyphSet = DEFAULT_GLYPH_SET, overrides }: {
  index: number; x: number; y: number; sz: number; fill: string;
  glyphSet?: string; overrides?: Record<string, string> | undefined;
}): React.ReactElement {
  const pathData = getSignPathByIndex(index, glyphSet, overrides);
  if (pathData) {
    return <path d={pathData.d} fill={fill} transform={glyphTransform(pathData.viewBox, x, y, sz)} />;
  }
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      fontSize={sz} fontFamily={GLYPH_FONT} fill={fill}>
      {ZODIAC_UNICODE[index]}
    </text>
  );
}

// Normalize angular difference to [-180, 180]
const angleDiff = (a: number, b: number): number => {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
};

// Cluster-based collision avoidance: detect overlapping groups and spread evenly
const spreadLabels = (longitudes: number[], minSep: number): number[] => {
  const n = longitudes.length;
  if (n <= 1) return [...longitudes];
  const positions = [...longitudes];

  for (let pass = 0; pass < 20; pass++) {
    let stable = true;

    // Detect clusters of overlapping labels and spread each evenly
    let i = 0;
    while (i < n) {
      const cluster = [i];
      for (let j = i + 1; j < n; j++) {
        const diff = Math.abs(angleDiff(positions[cluster[cluster.length - 1]!]!, positions[j]!));
        if (diff < minSep) {
          cluster.push(j);
        } else {
          break;
        }
      }

      if (cluster.length > 1) {
        // Compute center of cluster using angular mean (handles wrap-around)
        const refLon = positions[cluster[0]!]!;
        let sumOffset = 0;
        for (const idx of cluster) {
          sumOffset += angleDiff(refLon, positions[idx]!);
        }
        const centerLon = (refLon + sumOffset / cluster.length + 360) % 360;

        // Spread evenly around center
        const totalSpan = (cluster.length - 1) * minSep;
        for (let k = 0; k < cluster.length; k++) {
          const newPos = (centerLon - totalSpan / 2 + k * minSep + 360) % 360;
          if (Math.abs(angleDiff(positions[cluster[k]!]!, newPos)) > 0.01) {
            stable = false;
          }
          positions[cluster[k]!] = newPos;
        }
      }
      i += cluster.length;
    }

    // Handle wrap-around: check overlap between last and first planet
    if (n > 1) {
      const diff = Math.abs(angleDiff(positions[n - 1]!, positions[0]!));
      if (diff < minSep && diff > 0) {
        const push = (minSep - diff) / 2;
        const sign = angleDiff(positions[n - 1]!, positions[0]!) > 0 ? 1 : -1;
        positions[n - 1] = (positions[n - 1]! - sign * push + 360) % 360;
        positions[0] = (positions[0]! + sign * push + 360) % 360;
        stable = false;
      }
    }

    if (stable) break;
  }

  return positions;
};

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
  spirit: '#7B68EE',  // medium slate blue
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

// Only Ptolemaic aspects shown on the chart wheel
const PTOLEMAIC = new Set(['conjunction', 'opposition', 'trine', 'square', 'sextile']);

// Default theme colors (used when no theme prop is provided)
const DEFAULT_THEME = resolveTheme(DEFAULT_THEME_PREFERENCE);

// Egyptian bounds (Ptolemy) — each sign has 5 unequal terms ruled by traditional planets
// Format: [endDegreeInSign, rulingPlanet][]  (start is previous end or 0)
type BoundEntry = [number, string];
const EGYPTIAN_BOUNDS: BoundEntry[][] = [
  /* Aries */       [[6, 'jupiter'], [12, 'venus'], [20, 'mercury'], [25, 'mars'], [30, 'saturn']],
  /* Taurus */      [[8, 'venus'], [14, 'mercury'], [22, 'jupiter'], [27, 'saturn'], [30, 'mars']],
  /* Gemini */      [[6, 'mercury'], [12, 'jupiter'], [17, 'venus'], [24, 'mars'], [30, 'saturn']],
  /* Cancer */      [[7, 'mars'], [13, 'venus'], [19, 'mercury'], [26, 'jupiter'], [30, 'saturn']],
  /* Leo */         [[6, 'jupiter'], [11, 'venus'], [18, 'saturn'], [24, 'mercury'], [30, 'mars']],
  /* Virgo */       [[7, 'mercury'], [17, 'venus'], [21, 'jupiter'], [28, 'mars'], [30, 'saturn']],
  /* Libra */       [[6, 'saturn'], [14, 'mercury'], [21, 'jupiter'], [28, 'venus'], [30, 'mars']],
  /* Scorpio */     [[7, 'mars'], [11, 'venus'], [19, 'mercury'], [24, 'jupiter'], [30, 'saturn']],
  /* Sagittarius */ [[12, 'jupiter'], [17, 'venus'], [21, 'mercury'], [26, 'saturn'], [30, 'mars']],
  /* Capricorn */   [[7, 'mercury'], [14, 'jupiter'], [22, 'venus'], [26, 'saturn'], [30, 'mars']],
  /* Aquarius */    [[7, 'mercury'], [13, 'venus'], [20, 'jupiter'], [25, 'mars'], [30, 'saturn']],
  /* Pisces */      [[12, 'venus'], [16, 'jupiter'], [19, 'mercury'], [28, 'mars'], [30, 'saturn']],
];

// Chaldean decans — each sign has 3 × 10° faces
// Chaldean order: Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon (repeating from Mars for Aries)
const CHALDEAN_DECANS: [string, string, string][] = [
  /* Aries */       ['mars', 'sun', 'venus'],
  /* Taurus */      ['mercury', 'moon', 'saturn'],
  /* Gemini */      ['jupiter', 'mars', 'sun'],
  /* Cancer */      ['venus', 'mercury', 'moon'],
  /* Leo */         ['saturn', 'jupiter', 'mars'],
  /* Virgo */       ['sun', 'venus', 'mercury'],
  /* Libra */       ['moon', 'saturn', 'jupiter'],
  /* Scorpio */     ['mars', 'sun', 'venus'],
  /* Sagittarius */ ['mercury', 'moon', 'saturn'],
  /* Capricorn */   ['jupiter', 'mars', 'sun'],
  /* Aquarius */    ['venus', 'mercury', 'moon'],
  /* Pisces */      ['saturn', 'jupiter', 'mars'],
];

interface ChartWheelProps {
  chartData: ChartResult;
  transitData?: TransitResult | undefined;
  size?: number;
  ascHorizontal?: boolean | undefined;
  showAspects?: boolean | undefined;
  showBoundsDecans?: boolean | undefined;
  fixedAnchor?: number | undefined;
  glyphSet?: string | undefined;
  glyphOverrides?: Record<string, string> | undefined;
  theme?: ThemeColors | undefined;
}

export interface ChartWheelHandle {
  getSvgElement: () => SVGElement | null;
}

export const ChartWheel = forwardRef<ChartWheelHandle, ChartWheelProps>(
  ({ chartData, transitData, size = 800, ascHorizontal = true, showAspects = true, showBoundsDecans = false, fixedAnchor, glyphSet = DEFAULT_GLYPH_SET, glyphOverrides, theme: themeProp }: ChartWheelProps, ref: React.ForwardedRef<ChartWheelHandle>): React.JSX.Element => {
    const t = themeProp || DEFAULT_THEME;
    const elementColors = React.useMemo(() => signElementColors(t), [t]);
    // Scale glyph/label sizes by font size preference (1.3rem = 1.0x baseline)
    const fontScale = parseFloat(t.fontSize) / 1.3 || 1;
    const center = size / 2;
    // fixedAnchor overrides rotation (e.g. 0 = Aries at 9 o'clock for natural chart)
    // ASC Horizontal: Ascendant at 9 o'clock. Otherwise: 1st house cusp at 9 o'clock.
    const rotationAnchor = fixedAnchor !== undefined ? fixedAnchor : (ascHorizontal ? chartData.angles.ascendant : chartData.houses[0]!.longitude);
    const hasTransits = !!transitData;

    // Ring radii (as fractions of size/2)
    // When transits active, shrink the inner chart to make room for an outer transit band
    const R = hasTransits ? {
      transitOuter: center * 0.96,     // outermost transit planet labels
      transitInner: center * 0.78,     // inner edge of transit band (tick base)
      outer: center * 0.76,            // outer edge of zodiac ring
      zodiacInner: center * 0.62,      // inner edge of zodiac ring
      planetOuter: center * 0.62,      // natal planet band outer
      planetInner: center * 0.42,      // natal planet band inner
      houseNumOuter: center * 0.42,
      houseNumInner: center * 0.36,
      houseInner: center * 0.0,
    } : {
      transitOuter: center * 0.95,
      transitInner: center * 0.95,
      outer: center * 0.95,
      zodiacInner: center * 0.76,
      planetOuter: center * 0.76,
      planetInner: center * 0.52,
      houseNumOuter: center * 0.52,
      houseNumInner: center * 0.44,
      houseInner: center * 0.0,
    };
    // Derived: tick zone on inner edge of merged ring, glyphs in outer portion
    const ringWidth = R.outer - R.zodiacInner;
    // When bounds/decans enabled, redistribute the zodiac ring:
    //   30% sign glyphs | 25% ticks | 22.5% bounds | 22.5% decans
    // Normal: 63% sign glyphs | 37% ticks
    const tickEdge = showBoundsDecans
      ? R.outer - ringWidth * 0.30   // glyphs get top 30%
      : R.zodiacInner + ringWidth * 0.37;
    const tickBase = showBoundsDecans
      ? tickEdge - ringWidth * 0.25  // ticks get 25%
      : R.zodiacInner;

    // Convert ecliptic longitude to angle in SVG coordinate system
    // rotationAnchor at 9 o'clock (180°), counter-clockwise
    const toAngle = (longitude: number): number => {
      return ((180 - longitude + rotationAnchor) % 360 + 360) % 360;
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
      if (sorted.length === 0) return [];

      const labelPositions = spreadLabels(sorted.map(p => p.longitude), 6);

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

    // Collision avoidance for transit planet labels
    const transitLayouts = React.useMemo(() => {
      if (!transitData) return [];
      const sorted = [...transitData.planets].sort((a, b) => a.longitude - b.longitude);
      if (sorted.length === 0) return [];

      const labelPositions = spreadLabels(sorted.map(p => p.longitude), 6);

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
      <div style={{ width: '100%', aspectRatio: '1 / 1', maxWidth: `${size}px`, margin: '0 auto', touchAction: 'manipulation' }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${size} ${size}`}
          style={{ fontFamily: '"Cormorant", "Crimson Text", serif' }}
        >
          <defs>
            <radialGradient id="parchmentGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={t.backgroundAlt} />
              <stop offset="100%" stopColor={t.background} />
            </radialGradient>
            <filter id="subtleShadow" x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
              <feOffset in="blur" dx="1" dy="1" result="offsetBlur" />
              <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
            </filter>
            <clipPath id="aspectClip">
              <circle cx={center} cy={center} r={R.houseNumInner} />
            </clipPath>
            <clipPath id="axesClip">
              <path d={`M 0 0 H ${size} V ${size} H 0 Z M ${center + R.houseNumInner} ${center} A ${R.houseNumInner} ${R.houseNumInner} 0 1 1 ${center - R.houseNumInner} ${center} A ${R.houseNumInner} ${R.houseNumInner} 0 1 1 ${center + R.houseNumInner} ${center} Z`} clipRule="evenodd" />
            </clipPath>
          </defs>

          {/* === BACKGROUND === */}
          <circle cx={center} cy={center} r={(hasTransits ? R.transitOuter : R.outer) + 4} fill={t.background} />

          {/* === ZODIAC SIGN SEGMENTS (alternating fills, merged ring) === */}
          {Array.from({ length: 12 }).map((_, i) => {
            const startLon = i * 30;
            const endLon = (i + 1) * 30;
            return (
              <path
                key={`sign-seg-${i}`}
                d={arcPath(startLon, endLon, R.outer, R.zodiacInner)}
                fill={i % 2 === 0 ? t.segmentFillA : t.segmentFillB}
                stroke={t.wheelLines}
                strokeWidth={0.5}
                strokeOpacity={0.6}
              />
            );
          })}

          {/* === TICK MARKS (inner edge, facing outward) === */}
          {Array.from({ length: 360 }).map((_, deg) => {
            // Sign boundaries at every 30° — always full height through zodiac ring
            if (deg % 30 === 0) {
              const p1 = toPoint(deg, R.zodiacInner);
              const p2 = toPoint(deg, hasTransits ? R.transitOuter : R.outer + 2);
              return (
                <line
                  key={`bound-${deg}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={t.wheelLines} strokeWidth={1.5}
                />
              );
            }
            // 5° ticks (from tickBase outward ~60% of available tick zone)
            if (deg % 5 === 0) {
              const p1 = toPoint(deg, tickBase);
              const p2 = toPoint(deg, tickBase + (tickEdge - tickBase) * 0.6);
              return (
                <line
                  key={`tick5-${deg}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={t.wheelLines} strokeWidth={0.8} strokeOpacity={0.6}
                />
              );
            }
            // 1° ticks (from tickBase outward ~30% of available tick zone)
            const p1 = toPoint(deg, tickBase);
            const p2 = toPoint(deg, tickBase + (tickEdge - tickBase) * 0.3);
            return (
              <line
                key={`tick1-${deg}`}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={t.wheelLines} strokeWidth={0.4} strokeOpacity={0.35}
              />
            );
          })}

          {/* === ZODIAC SIGN GLYPHS (Unicode text, colored by element) === */}
          {Array.from({ length: 12 }).map((_, i) => {
            const midLon = i * 30 + 15;
            const midR = (tickEdge + R.outer) / 2;
            const pos = toPoint(midLon, midR);
            const glyphSize = (R.outer - tickEdge) * 0.6 * fontScale;

            return (
              <SignGlyph
                key={`sign-glyph-${i}`}
                index={i} x={pos.x} y={pos.y}
                sz={glyphSize} fill={elementColors[i]!}
                glyphSet={glyphSet} overrides={glyphOverrides}
              />
            );
          })}

          {/* === STRUCTURAL CIRCLES === */}
          <circle cx={center} cy={center} r={R.outer} fill="none" stroke={t.wheelLines} strokeWidth={1.5} />
          <circle cx={center} cy={center} r={R.zodiacInner} fill="none" stroke={t.wheelLines} strokeWidth={1} />
          <circle cx={center} cy={center} r={R.houseNumOuter} fill="none" stroke={t.wheelLines} strokeWidth={1} />
          <circle cx={center} cy={center} r={R.houseNumInner} fill="url(#parchmentGradient)" stroke={t.wheelLines} strokeWidth={1} />

          {/* === BOUNDS & DECANS RINGS (inside zodiac ring, below ticks) === */}
          {showBoundsDecans && (() => {
            // Bounds and decans sit between tickBase and zodiacInner
            const boundsOuter = tickBase;
            const boundsMid = R.zodiacInner + (tickBase - R.zodiacInner) * 0.5;
            const decansInner = R.zodiacInner;
            return (
              <>
                {/* Bounds ring segments */}
                {EGYPTIAN_BOUNDS.map((signBounds, signIdx) => {
                  let prev = 0;
                  return signBounds.map(([endDeg, ruler], bIdx) => {
                    const startLon = signIdx * 30 + prev;
                    const endLon = signIdx * 30 + endDeg;
                    prev = endDeg;
                    const color = PLANET_COLORS[ruler] || '#8B7355';
                    return (
                      <path
                        key={`bound-${signIdx}-${bIdx}`}
                        d={arcPath(startLon, endLon, boundsOuter, boundsMid)}
                        fill={color}
                        fillOpacity={parseFloat(t.boundsDecansOpacity) || 0.25}
                        stroke={t.wheelLines}
                        strokeWidth={0.3}
                        strokeOpacity={0.6}
                      />
                    );
                  });
                })}

                {/* Decans ring segments */}
                {CHALDEAN_DECANS.map((signDecans, signIdx) =>
                  signDecans.map((ruler, dIdx) => {
                    const startLon = signIdx * 30 + dIdx * 10;
                    const endLon = startLon + 10;
                    const color = PLANET_COLORS[ruler] || '#8B7355';
                    return (
                      <path
                        key={`decan-${signIdx}-${dIdx}`}
                        d={arcPath(startLon, endLon, boundsMid, decansInner)}
                        fill={color}
                        fillOpacity={parseFloat(t.boundsDecansOpacity) || 0.25}
                        stroke={t.wheelLines}
                        strokeWidth={0.3}
                        strokeOpacity={0.6}
                      />
                    );
                  }),
                )}

                {/* Structural circle between bounds and decans */}
                <circle cx={center} cy={center} r={boundsMid} fill="none" stroke={t.wheelLines} strokeWidth={0.5} />
                <circle cx={center} cy={center} r={boundsOuter} fill="none" stroke={t.wheelLines} strokeWidth={0.5} />

                {/* Sign boundary lines through bounds/decans */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const lon = i * 30;
                  const p1 = toPoint(lon, boundsOuter);
                  const p2 = toPoint(lon, decansInner);
                  return (
                    <line
                      key={`bd-sign-${i}`}
                      x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                      stroke={t.wheelLines} strokeWidth={0.8}
                    />
                  );
                })}

                {/* Ruler glyphs in bounds segments */}
                {EGYPTIAN_BOUNDS.map((signBounds, signIdx) => {
                  let prev = 0;
                  return signBounds.map(([endDeg, ruler], bIdx) => {
                    const midLon = signIdx * 30 + (prev + endDeg) / 2;
                    prev = endDeg;
                    const midR = (boundsOuter + boundsMid) / 2;
                    const pos = toPoint(midLon, midR);
                    const color = PLANET_COLORS[ruler] || '#8B7355';
                    const ringH = boundsOuter - boundsMid;
                    return (
                      <PlanetGlyph
                        key={`bound-glyph-${signIdx}-${bIdx}`}
                        planet={ruler} x={pos.x} y={pos.y}
                        sz={ringH * 0.55} fill={color} opacity={0.7}
                        glyphSet={glyphSet} overrides={glyphOverrides}
                      />
                    );
                  });
                })}

                {/* Ruler glyphs in decan segments */}
                {CHALDEAN_DECANS.map((signDecans, signIdx) =>
                  signDecans.map((ruler, dIdx) => {
                    const midLon = signIdx * 30 + dIdx * 10 + 5;
                    const midR = (boundsMid + decansInner) / 2;
                    const pos = toPoint(midLon, midR);
                    const color = PLANET_COLORS[ruler] || '#8B7355';
                    const ringH = boundsMid - decansInner;
                    return (
                      <PlanetGlyph
                        key={`decan-glyph-${signIdx}-${dIdx}`}
                        planet={ruler} x={pos.x} y={pos.y}
                        sz={ringH * 0.55} fill={color} opacity={0.7}
                        glyphSet={glyphSet} overrides={glyphOverrides}
                      />
                    );
                  }),
                )}
              </>
            );
          })()}

          {/* === HOUSE CUSP LINES (from outer circle to house number ring inner) === */}
          {chartData.houses.map((house) => {
            const isAngular = [1, 4, 7, 10].includes(house.house);
            const p1 = toPoint(house.longitude, hasTransits ? R.transitOuter : R.outer);
            const p2 = toPoint(house.longitude, R.houseNumInner);
            return (
              <line
                key={`house-line-${house.house}`}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={t.wheelLines}
                strokeWidth={isAngular ? 1.5 : 0.7}
                strokeOpacity={isAngular ? 1 : 0.6}
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
                fontSize={size * 0.022 * fontScale}
                fill="#a09080"
                fontWeight="500"
                fontFamily={LABEL_FONT}
              >
                {house}
              </text>
            );
          })}

          {/* === ASPECT LINES (clipped to inner circle, Ptolemaic only, orb-weighted) === */}
          {showAspects && (
            <g clipPath="url(#aspectClip)">
              {chartData.aspects.filter(a => PTOLEMAIC.has(a.type)).map((aspect, index) => {
                const p1 = chartData.planets.find(p => p.planet === aspect.planet1);
                const p2 = chartData.planets.find(p => p.planet === aspect.planet2);
                if (!p1 || !p2) return null;

                const lineR = R.houseNumInner * 0.92;
                const pos1 = toPoint(p1.longitude, lineR);
                const pos2 = toPoint(p2.longitude, lineR);
                const color = ASPECT_COLORS[aspect.type] || '#a09080';
                const isHard = ['opposition', 'square', 'conjunction'].includes(aspect.type);
                const orbFraction = Math.min(aspect.orb / 10, 1);
                const strokeWidth = 2.5 - orbFraction * 2.0;
                const strokeOpacity = 0.9 - orbFraction * 0.5;

                // Tick marks at inner circle where lines touch
                const tickOuter = R.houseNumInner;
                const tickInner = R.houseNumInner * 0.92;
                const t1i = toPoint(p1.longitude, tickInner);
                const t1o = toPoint(p1.longitude, tickOuter);
                const t2i = toPoint(p2.longitude, tickInner);
                const t2o = toPoint(p2.longitude, tickOuter);

                return (
                  <g key={`aspect-${index}`}>
                    <line
                      x1={pos1.x} y1={pos1.y} x2={pos2.x} y2={pos2.y}
                      stroke={color}
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      strokeDasharray={isHard ? 'none' : '4,3'}
                    />
                    <line x1={t1i.x} y1={t1i.y} x2={t1o.x} y2={t1o.y}
                      stroke={color} strokeWidth={strokeWidth} strokeOpacity={strokeOpacity} />
                    <line x1={t2i.x} y1={t2i.y} x2={t2o.x} y2={t2o.y}
                      stroke={color} strokeWidth={strokeWidth} strokeOpacity={strokeOpacity} />
                  </g>
                );
              })}
            </g>
          )}

          {/* === ANGULAR AXES (ASC-DSC, MC-IC — clipped to exclude inner circle) === */}
          {/* ASC — DSC axis */}
          {(() => {
            const ascOuter = toPoint(chartData.angles.ascendant, R.planetOuter);
            const dscOuter = toPoint(chartData.angles.descendant, R.planetOuter);
            const ascLabel = toPoint(chartData.angles.ascendant, R.planetOuter + size * 0.02);
            const dscLabel = toPoint(chartData.angles.descendant, R.planetOuter + size * 0.02);
            return (
              <g clipPath="url(#axesClip)">
                <line
                  x1={ascOuter.x} y1={ascOuter.y}
                  x2={dscOuter.x} y2={dscOuter.y}
                  stroke="#8B4513" strokeWidth={3}
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
              <g clipPath="url(#axesClip)">
                <line
                  x1={mcOuter.x} y1={mcOuter.y}
                  x2={icOuter.x} y2={icOuter.y}
                  stroke="#4A6B8A" strokeWidth={3}
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

          {/* === PLANET BAND: radial labels (planet glyph, then degree+sign+minute from outside in) === */}
          {planetLayouts.map((layout) => {
            const { planet, tickLongitude, labelLongitude, color } = layout;
            const bandH = R.planetOuter - R.planetInner;

            // Radial label positions from outside in: planet glyph, degree, sign, minute
            const labelStep = bandH * 0.20;
            const topR = R.planetOuter - bandH * 0.30;

            // Tick from zodiac inner edge, connector angles in to meet glyph position
            const tickTop = toPoint(tickLongitude, R.zodiacInner);
            const tickBot = toPoint(tickLongitude, R.planetOuter - bandH * 0.08);
            const connectorEnd = toPoint(labelLongitude, topR + bandH * 0.08);
            const glyphPos = toPoint(labelLongitude, topR);
            const degPos = toPoint(labelLongitude, topR - labelStep);
            const signPos = toPoint(labelLongitude, topR - labelStep * 2);
            const minPos = toPoint(labelLongitude, topR - labelStep * 3);

            const labelSz = Math.max(bandH * 0.13, size * 0.022) * fontScale;
            const signIndex = Math.floor(planet.longitude / 30) % 12;
            const signColor = elementColors[signIndex];

            return (
              <g key={planet.planet}>
                {/* Tick mark at true position */}
                <line
                  x1={tickTop.x} y1={tickTop.y} x2={tickBot.x} y2={tickBot.y}
                  stroke={color} strokeWidth={1.5}
                />

                {/* Connector line from tick to label column */}
                <line
                  x1={tickBot.x} y1={tickBot.y}
                  x2={connectorEnd.x} y2={connectorEnd.y}
                  stroke={color} strokeWidth={0.6} strokeOpacity={0.5}
                />

                {/* Planet glyph */}
                <PlanetGlyph
                  planet={planet.planet} x={glyphPos.x} y={glyphPos.y}
                  sz={planet.planet === 'vertex' ? labelSz * 0.65 : labelSz}
                  fill={color}
                  rotate={planet.planet === 'fortune' ? 45 : undefined}
                  glyphSet={glyphSet} overrides={glyphOverrides}
                />

                {/* Retrograde indicator */}
                {planet.retrograde && (
                  <text
                    x={glyphPos.x + labelSz * 0.6}
                    y={glyphPos.y - labelSz * 0.4}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={labelSz * 0.55} fill="#A0522D" fontStyle="italic"
                    fontFamily={LABEL_FONT}
                  >
                    R
                  </text>
                )}

                {/* Degree */}
                <text
                  x={degPos.x} y={degPos.y}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={labelSz} fill={t.text}
                  fontFamily={LABEL_FONT}
                >
                  {planet.degree}°
                </text>

                {/* Sign glyph */}
                <SignGlyph
                  index={signIndex} x={signPos.x} y={signPos.y}
                  sz={labelSz} fill={signColor!}
                  glyphSet={glyphSet} overrides={glyphOverrides}
                />

                {/* Minute */}
                <text
                  x={minPos.x} y={minPos.y}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={labelSz * 0.7} fill={t.text}
                  fontFamily={LABEL_FONT}
                >
                  {planet.minute.toString().padStart(2, '0')}′
                </text>
              </g>
            );
          })}

          {/* Lot of Fortune and Vertex are rendered as planets in the planet band */}

          {/* === TRANSIT OUTER RING (when active) === */}
          {hasTransits && transitData && (
            <>
              {/* Transit band boundary circles */}
              <circle cx={center} cy={center} r={R.transitOuter} fill="none" stroke={t.wheelLines} strokeWidth={1} />
              <circle cx={center} cy={center} r={R.transitInner} fill="none" stroke={t.wheelLines} strokeWidth={0.5} />

              {/* Transit ring degree tick marks (outer edge, facing inward) */}
              {Array.from({ length: 360 }).map((_, deg) => {
                // Skip sign boundaries (already drawn as full lines through zodiac)
                if (deg % 30 === 0) return null;
                const tickDepth = R.transitOuter - R.transitInner;
                if (deg % 5 === 0) {
                  // 5° ticks — 20% depth from outer edge
                  const p1 = toPoint(deg, R.transitOuter);
                  const p2 = toPoint(deg, R.transitOuter - tickDepth * 0.2);
                  return (
                    <line
                      key={`transit-tick5-${deg}`}
                      x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                      stroke={t.wheelLines} strokeWidth={0.6} strokeOpacity={0.6}
                    />
                  );
                }
                // 1° ticks — 10% depth from outer edge
                const p1 = toPoint(deg, R.transitOuter);
                const p2 = toPoint(deg, R.transitOuter - tickDepth * 0.1);
                return (
                  <line
                    key={`transit-tick1-${deg}`}
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    stroke={t.wheelLines} strokeWidth={0.3} strokeOpacity={0.35}
                  />
                );
              })}

              {/* Transit planet radial labels (planet, degree, sign, minute from outside in) */}
              {transitLayouts.map((layout) => {
                const { planet, tickLongitude, labelLongitude, color } = layout;
                const bandWidth = R.transitOuter - R.transitInner;

                // Radial labels from outside in: planet, degree, sign, minute
                const labelStep = bandWidth * 0.20;
                const topR = R.transitOuter - bandWidth * 0.30;

                // Tick mark from outer edge of zodiac, connector angles in to meet glyph
                const tickBase = toPoint(tickLongitude, R.outer);
                const tickEnd = toPoint(tickLongitude, R.outer + bandWidth * 0.08);
                const connectorEnd = toPoint(labelLongitude, topR + bandWidth * 0.08);
                const glyphPos = toPoint(labelLongitude, topR);
                const degPos = toPoint(labelLongitude, topR - labelStep);
                const signPos = toPoint(labelLongitude, topR - labelStep * 2);
                const minPos = toPoint(labelLongitude, topR - labelStep * 3);

                const labelSz = Math.max(bandWidth * 0.13, size * 0.022) * fontScale;
                const signIndex = Math.floor(planet.longitude / 30) % 12;
                const signColor = elementColors[signIndex];

                return (
                  <g key={`transit-${planet.planet}`}>
                    {/* Tick mark at true position */}
                    <line
                      x1={tickBase.x} y1={tickBase.y} x2={tickEnd.x} y2={tickEnd.y}
                      stroke={color} strokeWidth={1.5}
                    />

                    {/* Connector line from tick to label column */}
                    <line
                      x1={tickEnd.x} y1={tickEnd.y}
                      x2={connectorEnd.x} y2={connectorEnd.y}
                      stroke={color} strokeWidth={0.6} strokeOpacity={0.5}
                    />

                    {/* Planet glyph */}
                    <PlanetGlyph
                      planet={planet.planet} x={glyphPos.x} y={glyphPos.y}
                      sz={planet.planet === 'vertex' ? labelSz * 0.65 : labelSz}
                      fill={color}
                      rotate={planet.planet === 'fortune' ? 45 : undefined}
                      glyphSet={glyphSet} overrides={glyphOverrides}
                    />

                    {/* Retrograde indicator */}
                    {planet.retrograde && (
                      <text
                        x={glyphPos.x + labelSz * 0.6}
                        y={glyphPos.y - labelSz * 0.4}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={labelSz * 0.55} fill="#A0522D" fontStyle="italic"
                        fontFamily={LABEL_FONT}
                      >
                        R
                      </text>
                    )}

                    {/* Degree */}
                    <text
                      x={degPos.x} y={degPos.y}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={labelSz} fill={t.text}
                      fontFamily={LABEL_FONT}
                    >
                      {planet.degree}°
                    </text>

                    {/* Sign glyph */}
                    <SignGlyph
                      index={signIndex} x={signPos.x} y={signPos.y}
                      sz={labelSz} fill={signColor!}
                      glyphSet={glyphSet} overrides={glyphOverrides}
                    />

                    {/* Minute */}
                    <text
                      x={minPos.x} y={minPos.y}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={labelSz * 0.7} fill={t.text}
                      fontFamily={LABEL_FONT}
                    >
                      {planet.minute.toString().padStart(2, '0')}′
                    </text>
                  </g>
                );
              })}

              {/* Transit aspect lines (natal-to-transit, Ptolemaic only, orb-weighted) */}
              {showAspects && (
                <g clipPath="url(#aspectClip)">
                  {transitData.aspects.filter(a => PTOLEMAIC.has(a.type)).map((aspect, index) => {
                    const natalP = chartData.planets.find(p => p.planet === aspect.natalPlanet);
                    const transitP = transitData.planets.find(p => p.planet === aspect.transitPlanet);
                    if (!natalP || !transitP) return null;

                    const pos1 = toPoint(natalP.longitude, R.houseNumInner * 0.92);
                    const pos2 = toPoint(transitP.longitude, R.houseNumInner * 0.92);
                    const color = ASPECT_COLORS[aspect.type] || '#a09080';
                    const orbFraction = Math.min(aspect.orb / 8, 1);
                    const strokeWidth = (2.5 - orbFraction * 2.0) * 0.6;
                    const strokeOpacity = (0.9 - orbFraction * 0.5) * 0.6;

                    return (
                      <line
                        key={`transit-aspect-${index}`}
                        x1={pos1.x} y1={pos1.y} x2={pos2.x} y2={pos2.y}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeOpacity={strokeOpacity}
                        strokeDasharray="2,4"
                      />
                    );
                  })}
                </g>
              )}
            </>
          )}

          {/* === HOUSE CUSP DEGREE LABELS (on cusp lines at zodiac ring boundary) === */}
          {/* Skip for Whole Sign where all cusps fall at exactly 0° */}
          {(() => {
            const isWholeSigns = chartData.houses.every(h => h.degree === 0 && h.minute === 0);
            if (isWholeSigns) return null;
            const fontSize = size * 0.014 * fontScale;
            const labelR = R.zodiacInner + (R.outer - R.zodiacInner) * 0.05;
            return chartData.houses.map((house) => {
              const labelPos = toPoint(house.longitude, labelR);
              const angle = toAngle(house.longitude);
              const textAngle = angle > 90 && angle < 270 ? angle + 180 : angle;
              const labelText = `${house.degree}°${house.minute.toString().padStart(2, '0')}'`;
              // Background rect dimensions (approximate text bounds)
              const bgW = fontSize * 3.2;
              const bgH = fontSize * 1.3;
              return (
                <g key={`cusp-deg-${house.house}`}
                  transform={`rotate(${textAngle}, ${labelPos.x}, ${labelPos.y})`}
                >
                  <rect
                    x={labelPos.x - bgW / 2} y={labelPos.y - bgH / 2}
                    width={bgW} height={bgH}
                    fill={t.background} fillOpacity={0.85} rx={2}
                  />
                  <text
                    x={labelPos.x} y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={fontSize}
                    fill="#8B7355"
                    fontFamily={LABEL_FONT}
                    fontWeight="500"
                  >
                    {labelText}
                  </text>
                </g>
              );
            });
          })()}

          {/* Center dot */}
          <circle cx={center} cy={center} r={size * 0.006} fill={t.wheelLines} />
        </svg>
      </div>
    );
  },
);

