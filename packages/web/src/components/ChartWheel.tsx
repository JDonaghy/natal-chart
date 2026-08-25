import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { ChartResult, TransitResult } from '@natal-chart/core';
import { getPlanetPath, getPlanetGlyphRotation, getSignPathByIndex, glyphTransform, DEFAULT_GLYPH_SET, SIGN_ORDER } from '../utils/astro-glyph-paths';
import { getPlanetGlyph, getSignGlyph, getPlanetGlyphScale, PTOLEMAIC_ASPECT_SET } from '../utils/symbols';
import { type ThemeColors, resolveTheme, signElementColors, DEFAULT_THEME_PREFERENCE } from '../utils/themes';
import '../App.css';

const GLYPH_FONT = "'DejaVuSans', sans-serif";
const LABEL_FONT = "'Cormorant', serif";
// Unicode text glyphs only fill ~70% of their em-box, so text fallbacks look
// smaller than SVG path glyphs (which fill sz×sz). Bump the font size to match.
const TEXT_FALLBACK_SCALE = 1.4;

// "Faux-bold" the planet glyphs: outline each filled path in its own fill
// color so every planet reads at Mars's visual weight (issue #32) — Mars's
// path already carries built-in geometric heft (packages/web/src/utils/
// glyphs/sources/classic.ts), the rest don't, and there's no other
// stroke-width knob on these filled paths to turn. `vector-effect:
// non-scaling-stroke` keeps the stroke width in final screen units
// regardless of the glyph's own transform/scale, so it stays proportional
// to `sz` (the caller's requested render size) instead of the glyph's
// internal viewBox units.
//
// issue #57: the #32 boost read as too heavy/bold on small mobile screens.
// Scaled the base factor down (0.05 -> 0.03, ~40% thinner) while leaving
// GLYPH_EXTRA_STROKE's multiplier untouched, so sun/moon keep the same
// *relative* boost over the other planets that #32 established (still at
// least Mars's weight) — only the absolute stroke weight app-wide drops.
// Because stroke straddles the path edge, thinning it also pulls the
// glyph's outer edge slightly inward, so this makes glyphs marginally
// smaller if anything, never larger — safe for the "don't change
// size/position" constraint.
const GLYPH_STROKE_FACTOR = 0.03;
// Sun and Moon read thin/light next to Mars even with the base boost.
const GLYPH_EXTRA_STROKE: Record<string, number> = { sun: 1.9, moon: 1.9 };

// issue #57: sign glyphs (SignGlyph below) never got the #32 stroke boost —
// they're plain filled paths, same as GlyphIcon.tsx's SignGlyphIcon — so
// GLYPH_STROKE_FACTOR doesn't apply to them and there's no boldness knob to
// dial down directly. Same fix as GlyphIcon.tsx: shrink slightly, which
// reads as visually lighter (less filled area) without materially moving
// the glyph, since glyphTransform keeps it centered on (x, y) for any sz.
// Also applied to both PlanetGlyph's and SignGlyph's text-<text> fallback
// branches below, alongside GLYPH_EXTRA_STROKE's sibling constant
// TEXT_FALLBACK_WEIGHT, for the same reason GlyphIcon.tsx sets it: the
// bundled DejaVuSans has only one weight, so font-weight alone can't thin
// those, but the size reduction can.
const GLYPH_BOLDNESS_SCALE = 0.94;
const TEXT_FALLBACK_WEIGHT = 300;

/**
 * Shared degree-label font-size formula: a floor of `size * 0.0264` (so text
 * stays legible even in a thin band) that otherwise scales with the band's
 * own height. Used for the planet-position degree text, the outer-wheel
 * planet-degree labels, and the ASC/DSC/MC/IC angle-degree text — kept in
 * one place so all of them stay in sync (issue #32).
 */
function degreeLabelFontSize(bandH: number, size: number, fontScale: number): number {
  return Math.max(bandH * 0.156, size * 0.0264) * fontScale;
}

/** Render a planet glyph as an SVG <path> (font-independent), falling back to <text> */
function PlanetGlyph({ planet, x, y, sz, fill, rotate, opacity, glyphSet = DEFAULT_GLYPH_SET, overrides }: {
  planet: string; x: number; y: number; sz: number; fill: string;
  rotate?: number | undefined; opacity?: number | undefined;
  glyphSet?: string; overrides?: Record<string, string> | undefined;
}): React.ReactElement {
  const pathData = getPlanetPath(planet, glyphSet, overrides);
  // Derived glyphs (South Node = North Node turned 180°) carry their own
  // rotation, on top of any rotation the caller asked for.
  const totalRotate = (rotate ?? 0) + getPlanetGlyphRotation(planet);
  if (pathData) {
    const t = glyphTransform(pathData.viewBox, x, y, sz);
    const fullT = totalRotate ? `rotate(${totalRotate} ${x} ${y}) ${t}` : t;
    const strokeWidth = sz * GLYPH_STROKE_FACTOR * (GLYPH_EXTRA_STROKE[planet] ?? 1);
    return (
      <path
        data-planet={planet} d={pathData.d} fill={fill} fillOpacity={opacity}
        stroke={fill} strokeOpacity={opacity} strokeWidth={strokeWidth}
        strokeLinejoin="round" vectorEffect="non-scaling-stroke"
        transform={fullT}
      />
    );
  }
  // Fallback to text for glyphs with no path data at all (Vertex's "Vx").
  // The per-planet scale factor applies here too, or the fallback renders a
  // full 1.4x larger than the path glyphs beside it (issue #28).
  return (
    <text data-planet={planet} x={x} y={y} textAnchor="middle" dominantBaseline="central"
      fontSize={sz * TEXT_FALLBACK_SCALE * GLYPH_BOLDNESS_SCALE} fontWeight={TEXT_FALLBACK_WEIGHT}
      fontFamily={GLYPH_FONT} fill={fill} fillOpacity={opacity}
      transform={totalRotate ? `rotate(${totalRotate} ${x} ${y})` : undefined}>
      {getPlanetGlyph(planet)}
    </text>
  );
}

/** Render a zodiac sign glyph as an SVG <path>, falling back to <text> */
function SignGlyph({ index, x, y, sz, fill, glyphSet = DEFAULT_GLYPH_SET, overrides }: {
  index: number; x: number; y: number; sz: number; fill: string;
  glyphSet?: string; overrides?: Record<string, string> | undefined;
}): React.ReactElement {
  const pathData = getSignPathByIndex(index, glyphSet, overrides);
  const sign = SIGN_ORDER[index] ?? '';
  if (pathData) {
    return (
      <path data-sign={sign} d={pathData.d} fill={fill}
        transform={glyphTransform(pathData.viewBox, x, y, sz * GLYPH_BOLDNESS_SCALE)} />
    );
  }
  return (
    <text data-sign={sign} x={x} y={y} textAnchor="middle" dominantBaseline="central"
      fontSize={sz * GLYPH_BOLDNESS_SCALE} fontWeight={TEXT_FALLBACK_WEIGHT} fontFamily={GLYPH_FONT} fill={fill}>
      {getSignGlyph(sign)}
    </text>
  );
}

/** Format an ecliptic longitude as degrees-and-minutes within its sign. */
function formatDegreeInSign(longitude: number): string {
  const inSign = ((longitude % 30) + 30) % 30;
  const deg = Math.floor(inSign);
  const min = Math.floor((inSign - deg) * 60);
  return `${deg}°${min.toString().padStart(2, '0')}′`;
}

/**
 * An angle marker (ASC/DSC/MC/IC): its name, with its degree underneath.
 *
 * The degree line always renders at `degreeFontSize`/`degreeColor` — callers
 * pass the same size/color used for the planet-band degree text so all four
 * angles read exactly as legibly as the planets (issue #32). `fontSize`/
 * `color`/`fontWeight` style only the name ("ASC" etc.) above it.
 */
function AngleLabel({ x, y, label, longitude, fontSize, color, fontWeight, degreeFontSize, degreeColor }: {
  x: number; y: number; label: string; longitude: number;
  fontSize: number; color: string; fontWeight: string;
  degreeFontSize: number; degreeColor: string;
}): React.ReactElement {
  return (
    <>
      <text
        x={x} y={y - fontSize * 0.35}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fill={color} fontWeight={fontWeight}
      >
        {label}
      </text>
      <text
        x={x} y={y + fontSize * 0.75}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={degreeFontSize} fill={degreeColor} fontFamily={LABEL_FONT}
      >
        {formatDegreeInSign(longitude)}
      </text>
    </>
  );
}

// Normalize angular difference to [-180, 180]
const angleDiff = (a: number, b: number): number => {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
};

// Collision avoidance for planet labels (two passes).
//
// Forward pass: walk ascending longitude, push each label to
//   max(trueLon, prevLabel + minSep). Guarantees monotonic order and
//   keeps the lowest-degree planet near its true position.
//
// Settle pass: walk forward again and nudge each label clockwise into
//   available space — halfway between the floor (sign boundary or
//   prevLabel + minSep) and the ceiling (nextLabel − minSep or trueLon,
//   whichever is larger). This pulls glyphs away from sign boundaries
//   and uses empty clockwise room without breaking order.
const spreadLabels = (longitudes: number[], minSep: number): number[] => {
  const n = longitudes.length;
  if (n <= 1) return [...longitudes];
  const positions = [...longitudes];

  // Forward pass: push labels counter-clockwise to avoid overlap
  for (let i = 1; i < n; i++) {
    const gap = angleDiff(positions[i - 1]!, positions[i]!);
    if (gap < minSep) {
      positions[i] = (positions[i - 1]! + minSep + 360) % 360;
    }
  }

  // Handle wrap-around: if last overlaps first, push last back clockwise
  if (n > 1) {
    const wrapDiff = angleDiff(positions[n - 1]!, (positions[0]! + 360));
    if (Math.abs(wrapDiff) < minSep && Math.abs(wrapDiff) > 0) {
      positions[n - 1] = (positions[0]! + 360 - minSep + 360) % 360;
    }
  }

  // Settle pass: only for planets that were pushed by the forward pass.
  // Nudge them clockwise into available gaps to reduce displacement from true position.
  for (let i = 0; i < n; i++) {
    const trueLon = longitudes[i]!;
    // Skip planets that are still at their true position (not displaced)
    if (Math.abs(angleDiff(trueLon, positions[i]!)) < 0.01) continue;

    const signStart = Math.floor(trueLon / 30) * 30;

    // Floor: sign boundary or previous label + minSep (whichever is further CCW)
    const floor = i > 0
      ? Math.max(signStart, (positions[i - 1]! + minSep + 360) % 360)
      : signStart;

    // Ceiling: next label − minSep, but never below trueLon (don't push past true pos)
    const ceiling = i < n - 1
      ? Math.max(trueLon, (positions[i + 1]! - minSep + 360) % 360)
      : positions[i]!;

    // Target: midpoint of available window, clamped to [floor, current position]
    if (ceiling > floor) {
      const mid = (floor + ceiling) / 2;
      // Only move clockwise (toward floor), never counter-clockwise past current
      const target = Math.max(floor, Math.min(mid, positions[i]!));
      positions[i] = target;
    }
  }

  return positions;
};

// Planet colors (traditional astrology associations).
// Darkened/saturated across the board (issue #32) so every glyph reads at
// Mars's (#CC4422) visual weight instead of looking thin and pale beside it.
// Sun and Moon needed it doubliest — goldenrod and silver-gray were the two
// lightest, least saturated entries in the old map.
const PLANET_COLORS: Record<string, string> = {
  sun: '#C9971A',     // deep saturated amber-gold (was goldenrod #DAA520)
  moon: '#5C6B78',    // dark slate blue-gray (was flat silver #8C8C8C)
  mercury: '#E0951C',  // amber
  venus: '#3E9142',   // deep green
  mars: '#CC4422',    // bright red-brown (reference weight)
  jupiter: '#2B6CB0', // deep blue
  saturn: '#5A5248',  // dark warm slate (was flat medium gray #888888)
  uranus: '#1DA8A8',  // deep teal
  neptune: '#3658C4', // deep blue
  pluto: '#7D3F94',   // deep purple
  northNode: '#6F4FA0', // deep lavender
  southNode: '#6F4FA0', // deep lavender (South Node mirrors the North)
  chiron: '#A8661C',  // deep bronze
  lilith: '#3D2A1C',  // deep brown
  fortune: '#B8860B', // goldenrod
  spirit: '#5F4BC4',  // deep slate blue
  vertex: '#33526E',  // deep slate blue
};

// Aspect colors — warm palette
const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#C08030',
  opposition: '#CC4422',
  trine: '#3D7AB8',
  square: '#CC4422',
  sextile: '#3D7AB8',
};

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

/** A point drawn in the wheel's planet band. Not every one is a calculated
 *  body — the South Node is derived from the North Node. */
interface WheelPoint {
  planet: string;
  longitude: number;
  degree: number;
  minute: number;
  retrograde: boolean;
}

/** The South Node: the point exactly opposite the North Node. */
function southNodeFrom(northNodeLongitude: number): WheelPoint {
  const longitude = (northNodeLongitude + 180) % 360;
  const inSign = longitude % 30;
  const degree = Math.floor(inSign);
  return {
    planet: 'southNode',
    longitude,
    degree,
    minute: Math.floor((inSign - degree) * 60),
    retrograde: false,
  };
}

interface ChartWheelProps {
  chartData: ChartResult;
  transitData?: TransitResult | undefined;
  size?: number;
  ascHorizontal?: boolean | undefined;
  showAspects?: boolean | undefined;
  showBoundsDecans?: boolean | undefined;
  hideSignGlyphs?: boolean | undefined;
  fixedAnchor?: number | undefined;
  glyphSet?: string | undefined;
  glyphOverrides?: Record<string, string> | undefined;
  theme?: ThemeColors | undefined;
  /** Whole-sign house number (1-12) to highlight, e.g. the annual-profections
   *  activated house — drawn as a bold triangle from center to the outer rim. */
  highlightHouse?: number | undefined;
  highlightColor?: string | undefined;
}

export interface ChartWheelHandle {
  getSvgElement: () => SVGElement | null;
}

export const ChartWheel = forwardRef<ChartWheelHandle, ChartWheelProps>(
  ({ chartData, transitData, size = 800, ascHorizontal = true, showAspects = true, showBoundsDecans = false, hideSignGlyphs = false, fixedAnchor, glyphSet = DEFAULT_GLYPH_SET, glyphOverrides, theme: themeProp, highlightHouse, highlightColor = '#b8860b' }: ChartWheelProps, ref: React.ForwardedRef<ChartWheelHandle>): React.JSX.Element => {
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
    // When transits active, shrink the inner chart to make room for an outer transit band.
    // The planet band (planetInner→planetOuter) is widened by moving planetInner/
    // houseNumOuter inward and shrinking the blank center circle (houseNumInner) to
    // make room — more radial space for the stacked degree/sign/minute text, at the
    // cost of a bit of empty space at the chart's center (issue #32). planetOuter/
    // zodiacInner/outer are left untouched so the planet band still seams cleanly
    // against the zodiac ring.
    const R = hasTransits ? {
      transitOuter: center * 0.96,     // outermost transit planet labels
      transitInner: center * 0.78,     // inner edge of transit band (tick base)
      outer: center * 0.76,            // outer edge of zodiac ring
      zodiacInner: center * 0.62,      // inner edge of zodiac ring
      planetOuter: center * 0.62,      // natal planet band outer
      planetInner: center * 0.36,      // natal planet band inner (was 0.42)
      houseNumOuter: center * 0.36,
      houseNumInner: center * 0.28,    // was 0.36
      houseInner: center * 0.0,
    } : {
      transitOuter: center * 0.95,
      transitInner: center * 0.95,
      outer: center * 0.95,
      zodiacInner: center * 0.76,
      planetOuter: center * 0.76,
      planetInner: center * 0.46,      // was 0.52
      houseNumOuter: center * 0.46,
      houseNumInner: center * 0.36,    // was 0.44
      houseInner: center * 0.0,
    };
    // Derived: tick zone on inner edge of merged ring, glyphs in outer portion
    const ringWidth = R.outer - R.zodiacInner;
    // When bounds/decans enabled, redistribute the zodiac ring:
    //   38% sign glyphs | 20% ticks | 21% bounds | 21% decans
    // (was 30% | 25% | 22.5% | 22.5% — sign glyphs get more room so they
    // shrink less in Bounds/Decans mode, issue #32; bounds/decans split the
    // remainder evenly via boundsMid below, so only these two literals move)
    // Normal: 63% sign glyphs | 37% ticks
    const tickEdge = showBoundsDecans
      ? R.outer - ringWidth * 0.38   // glyphs get top 38%
      : R.zodiacInner + ringWidth * 0.37;
    const tickBase = showBoundsDecans
      ? tickEdge - ringWidth * 0.20  // ticks get 20%
      : R.zodiacInner;

    // Shared with the planet-band degree text below (same formula, same
    // bandH) so ASC/DSC/MC/IC's degree line renders at an identical size
    // (issue #32).
    const planetBandH = R.planetOuter - R.planetInner;
    const angleDegreeFontSize = degreeLabelFontSize(planetBandH, size, fontScale);

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
      const points: WheelPoint[] = chartData.planets.map(p => ({
        planet: p.planet as string,
        longitude: p.longitude,
        degree: p.degree,
        minute: p.minute,
        retrograde: p.retrograde,
      }));

      // The South Node isn't a calculated body — it's the point exactly
      // opposite the North Node, so derive and draw it here (issue #28).
      const northNode = chartData.planets.find(p => p.planet === 'northNode');
      if (northNode) points.push(southNodeFrom(northNode.longitude));

      const sorted = points.sort((a, b) => a.longitude - b.longitude);
      if (sorted.length === 0) return [];

      const labelPositions = spreadLabels(sorted.map(p => p.longitude), 5);

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

    // Collision avoidance for transit planet labels (tighter spacing — narrower band)
    const transitLayouts = React.useMemo(() => {
      if (!transitData) return [];
      const sorted = [...transitData.planets].sort((a, b) => a.longitude - b.longitude);
      if (sorted.length === 0) return [];

      const labelPositions = spreadLabels(sorted.map(p => p.longitude), 3.5);

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
          data-testid="chart-wheel"
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
          {/* The outermost ring (transiting planets) goes white for contrast
              against them (issue #32) — only that band, not the whole wheel:
              layer a white disc out to the transit band's outer edge, then
              paint the themed background back over the natal wheel's area
              on top of it. Natal-only charts keep the single themed circle. */}
          {hasTransits ? (
            <>
              <circle data-role="wheel-background" cx={center} cy={center} r={R.transitOuter + 4} fill="#FFFFFF" />
              <circle data-role="wheel-background" cx={center} cy={center} r={R.transitInner + 1} fill={t.background} />
            </>
          ) : (
            <circle data-role="wheel-background" cx={center} cy={center} r={R.outer + 4} fill={t.background} />
          )}

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
          <circle data-role="wheel-background" cx={center} cy={center} r={R.houseNumInner} fill="url(#parchmentGradient)" stroke={t.wheelLines} strokeWidth={1} />

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
          {/* data-role lets the PDF exporter force these to black against the
              white print background without touching the on-screen theme. */}
          {houseMiddles.map(({ house, longitude }) => {
            const pos = toPoint(longitude, (R.houseNumOuter + R.houseNumInner) / 2);
            return (
              <text
                key={`house-num-${house}`}
                data-role="house-number"
                x={pos.x} y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.022 * fontScale}
                fill={t.text}
                fontWeight="600"
                fontFamily={LABEL_FONT}
              >
                {house}
              </text>
            );
          })}

          {/* === ASPECT LINES (clipped to inner circle, Ptolemaic only, orb-weighted) === */}
          {showAspects && (
            <g clipPath="url(#aspectClip)">
              {chartData.aspects.filter(a => PTOLEMAIC_ASPECT_SET.has(a.type)).map((aspect, index) => {
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
          {/* Each angle shows its degree underneath its name, the way the
              planets in the planet band already do (issue #28). */}
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
                <AngleLabel
                  x={ascLabel.x} y={ascLabel.y} label="ASC"
                  longitude={chartData.angles.ascendant}
                  fontSize={size * 0.022} color="#8B4513" fontWeight="bold"
                  degreeFontSize={angleDegreeFontSize} degreeColor={t.text}
                />
                <AngleLabel
                  x={dscLabel.x} y={dscLabel.y} label="DSC"
                  longitude={chartData.angles.descendant}
                  fontSize={size * 0.022} color="#8B4513" fontWeight="bold"
                  degreeFontSize={angleDegreeFontSize} degreeColor={t.text}
                />
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
                <AngleLabel
                  x={mcLabel.x} y={mcLabel.y} label="MC"
                  longitude={chartData.angles.midheaven}
                  fontSize={size * 0.022} color="#4A6B8A" fontWeight="bold"
                  degreeFontSize={angleDegreeFontSize} degreeColor={t.text}
                />
                <AngleLabel
                  x={icLabel.x} y={icLabel.y} label="IC"
                  longitude={chartData.angles.imumCoeli}
                  fontSize={size * 0.022} color="#4A6B8A" fontWeight="bold"
                  degreeFontSize={angleDegreeFontSize} degreeColor={t.text}
                />
              </g>
            );
          })()}

          {/* === PLANET BAND: radial labels (planet glyph, then degree+sign+minute from outside in) === */}
          {planetLayouts.map((layout) => {
            const { planet, tickLongitude, labelLongitude, color } = layout;
            const bandH = R.planetOuter - R.planetInner;

            // Radial label positions from outside in: planet glyph, degree, [sign], minute
            const labelStep = bandH * 0.20;
            const topR = R.planetOuter - bandH * 0.30;

            // Tick from zodiac inner edge, connector angles in to meet glyph position
            const tickTop = toPoint(tickLongitude, R.zodiacInner);
            const tickBot = toPoint(tickLongitude, R.planetOuter - bandH * 0.08);
            const connectorEnd = toPoint(labelLongitude, topR + bandH * 0.08);
            const glyphPos = toPoint(labelLongitude, topR);
            // Degree sits between planet glyph and (smaller) sign — nudge inward
            const degPos = hideSignGlyphs
              ? toPoint(labelLongitude, topR - labelStep * 1.5)
              : toPoint(labelLongitude, topR - labelStep * 1.15);
            const signPos = toPoint(labelLongitude, topR - labelStep * 2);
            const minPos = hideSignGlyphs
              ? toPoint(labelLongitude, topR - labelStep * 2.5)
              : toPoint(labelLongitude, topR - labelStep * 3);

            const labelSz = degreeLabelFontSize(bandH, size, fontScale);
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
                  sz={labelSz * getPlanetGlyphScale(planet.planet)}
                  fill={color}
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
                  {planet.degree}<tspan fontSize={labelSz * 0.65}>°</tspan>
                </text>

                {/* Sign glyph (30% smaller than planet glyph) */}
                {!hideSignGlyphs && (
                  <SignGlyph
                    index={signIndex} x={signPos.x} y={signPos.y}
                    sz={labelSz * 0.8} fill={signColor!}
                    glyphSet={glyphSet} overrides={glyphOverrides}
                  />
                )}

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

                // Radial labels from outside in: planet, degree, [sign], minute
                const labelStep = bandWidth * 0.27;
                const topR = R.transitOuter - bandWidth * 0.22;

                // Tick mark from outer edge of zodiac, connector angles in to meet glyph
                const tickBase = toPoint(tickLongitude, R.outer);
                const tickEnd = toPoint(tickLongitude, R.outer + bandWidth * 0.08);
                const connectorEnd = toPoint(labelLongitude, topR + bandWidth * 0.08);
                const glyphPos = toPoint(labelLongitude, topR);
                const degPos = toPoint(labelLongitude, topR - labelStep);
                const signPos = toPoint(labelLongitude, topR - labelStep * 2);
                const minPos = hideSignGlyphs
                  ? toPoint(labelLongitude, topR - labelStep * 2)
                  : toPoint(labelLongitude, topR - labelStep * 3);

                const labelSz = degreeLabelFontSize(bandWidth, size, fontScale);
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
                      sz={labelSz * getPlanetGlyphScale(planet.planet)}
                      fill={color}
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
                      {planet.degree}<tspan fontSize={labelSz * 0.65}>°</tspan>
                    </text>

                    {/* Sign glyph */}
                    {!hideSignGlyphs && (
                      <SignGlyph
                        index={signIndex} x={signPos.x} y={signPos.y}
                        sz={labelSz} fill={signColor!}
                        glyphSet={glyphSet} overrides={glyphOverrides}
                      />
                    )}

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
                  {transitData.aspects.filter(a => PTOLEMAIC_ASPECT_SET.has(a.type)).map((aspect, index) => {
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

          {/* === ANNUAL PROFECTIONS HIGHLIGHT (bold triangle around the activated house) === */}
          {/* Spans from the wheel's center to its outermost ring, so with a
              transit overlay active it cuts through both the natal and
              transit bands together. */}
          {highlightHouse != null && (() => {
            const startHouse = chartData.houses.find(h => h.house === highlightHouse);
            const endHouse = chartData.houses.find(h => h.house === (highlightHouse % 12) + 1);
            if (!startHouse || !endHouse) return null;
            const outerR = hasTransits ? R.transitOuter : R.outer;
            const p1 = toPoint(startHouse.longitude, outerR);
            const p2 = toPoint(endHouse.longitude, outerR);
            return (
              <path
                data-role="profection-highlight"
                d={`M ${center} ${center} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} Z`}
                fill={highlightColor}
                fillOpacity={0.1}
                stroke={highlightColor}
                strokeWidth={4}
                strokeLinejoin="round"
              />
            );
          })()}
        </svg>
      </div>
    );
  },
);

