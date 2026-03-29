/**
 * SVG path data for astrological glyphs.
 * All paths are defined in a 0-100 coordinate space (viewBox="0 0 100 100").
 * Use transform="translate(x,y) scale(s)" to position and size.
 */

// Planet glyph SVG paths (normalized to ~100x100 coordinate space)
export const PLANET_GLYPH_PATHS: Record<string, { d: string; viewBox: string }> = {
  sun: {
    // Circle with dot in center
    d: 'M50,5 A45,45 0 1,1 49.99,5 Z M50,40 A10,10 0 1,1 49.99,40 Z',
    viewBox: '0 0 100 100',
  },
  moon: {
    // Crescent moon
    d: 'M65,10 A40,40 0 1,1 65,90 A30,30 0 1,0 65,10 Z',
    viewBox: '0 0 100 100',
  },
  mercury: {
    // Circle with cross below and crescent on top
    d: 'M50,30 A18,18 0 1,1 49.99,30 Z M50,28 A20,20 0 1,0 49.99,28 Z ' +
       'M50,66 L50,95 M38,82 L62,82 ' +
       'M30,8 A20,15 0 0,1 70,8',
    viewBox: '0 0 100 100',
  },
  venus: {
    // Circle with cross below
    d: 'M50,5 A22,22 0 1,1 49.99,5 Z M50,3 A24,24 0 1,0 49.99,3 Z ' +
       'M50,49 L50,90 M35,72 L65,72',
    viewBox: '0 0 100 100',
  },
  mars: {
    // Circle with arrow upper-right
    d: 'M40,35 A25,25 0 1,1 39.99,35 Z M40,33 A27,27 0 1,0 39.99,33 Z ' +
       'M58,22 L82,2 M82,2 L82,25 M82,2 L60,2',
    viewBox: '0 0 100 100',
  },
  jupiter: {
    // Stylized number 4 shape with curved left
    d: 'M20,10 Q10,30 20,50 Q30,55 40,50 ' +
       'M40,10 L40,90 ' +
       'M15,60 L70,60 ' +
       'M60,45 L60,75',
    viewBox: '0 0 85 100',
  },
  saturn: {
    // Cross on top, curved body
    d: 'M30,5 L30,25 M20,15 L40,15 ' +
       'M30,25 Q30,45 50,45 Q70,45 70,60 Q70,80 50,85 Q35,88 25,78 ' +
       'L35,70',
    viewBox: '0 0 100 100',
  },
  uranus: {
    // Circle with dot, vertical line, and H-bar
    d: 'M50,55 A10,10 0 1,1 49.99,55 Z ' +
       'M50,45 L50,10 ' +
       'M30,10 L30,35 M70,10 L70,35 M30,10 L70,10',
    viewBox: '0 0 100 100',
  },
  neptune: {
    // Trident
    d: 'M50,30 L50,95 ' +
       'M30,80 L70,80 ' +
       'M15,10 Q15,45 50,30 Q85,45 85,10 ' +
       'M15,10 L15,30 M85,10 L85,30 M50,10 L50,30',
    viewBox: '0 0 100 100',
  },
  pluto: {
    // Circle with arc on top and cross below
    d: 'M50,30 A15,15 0 1,1 49.99,30 Z M50,28 A17,17 0 1,0 49.99,28 Z ' +
       'M25,15 A25,25 0 0,1 75,15 ' +
       'M50,60 L50,90 M37,75 L63,75',
    viewBox: '0 0 100 100',
  },
  northNode: {
    // Omega-like shape (ascending node)
    d: 'M15,75 L15,40 A25,25 0 1,1 50,65 A25,25 0 1,1 85,40 L85,75',
    viewBox: '0 0 100 100',
  },
  chiron: {
    // Key shape - circle with K on top
    d: 'M50,50 A15,15 0 1,1 49.99,50 Z M50,48 A17,17 0 1,0 49.99,48 Z ' +
       'M50,33 L50,5 ' +
       'M50,20 L70,5 M50,20 L70,35',
    viewBox: '0 0 100 100',
  },
};

// Zodiac sign SVG paths
export const SIGN_GLYPH_PATHS: Record<string, { d: string; viewBox: string }> = {
  aries: {
    // Ram's horns - two curved arcs meeting at center
    d: 'M15,80 Q15,15 50,30 Q85,15 85,80 M50,30 L50,90',
    viewBox: '0 0 100 100',
  },
  taurus: {
    // Bull's head - circle with horns on top
    d: 'M50,55 A22,22 0 1,1 49.99,55 Z ' +
       'M15,10 Q15,40 50,35 Q85,40 85,10',
    viewBox: '0 0 100 100',
  },
  gemini: {
    // Twins - two vertical lines with top and bottom arcs
    d: 'M20,15 Q50,5 80,15 M20,85 Q50,95 80,85 ' +
       'M35,15 L35,85 M65,15 L65,85',
    viewBox: '0 0 100 100',
  },
  cancer: {
    // Crab - two connected circles/arcs (69 rotated)
    d: 'M25,40 A15,15 0 1,1 24.99,40 Z ' +
       'M75,60 A15,15 0 1,1 74.99,60 Z ' +
       'M40,40 Q75,40 75,45 ' +
       'M60,60 Q25,60 25,55',
    viewBox: '0 0 100 100',
  },
  leo: {
    // Lion - curved loop
    d: 'M30,70 A15,15 0 1,1 30,40 Q30,20 50,20 Q75,20 75,40 Q75,60 55,60 Q40,60 40,75 Q40,90 55,90',
    viewBox: '0 0 100 100',
  },
  virgo: {
    // Maiden - three vertical strokes with loop
    d: 'M15,20 L15,70 Q15,85 30,70 L30,20 ' +
       'M30,70 Q30,85 45,70 L45,20 ' +
       'M45,70 Q45,85 60,85 Q75,85 75,70 L75,55 ' +
       'M65,55 L85,55',
    viewBox: '0 0 100 100',
  },
  libra: {
    // Scales - horizontal line with sunset arc
    d: 'M10,80 L90,80 M10,60 L90,60 ' +
       'M25,60 Q25,25 50,25 Q75,25 75,60',
    viewBox: '0 0 100 100',
  },
  scorpio: {
    // Scorpion - like virgo but with arrow tail
    d: 'M15,20 L15,70 Q15,85 30,70 L30,20 ' +
       'M30,70 Q30,85 45,70 L45,20 ' +
       'M45,70 Q45,85 60,85 L75,85 L75,70 ' +
       'M75,85 L85,75 M75,85 L85,95',
    viewBox: '0 0 100 100',
  },
  sagittarius: {
    // Archer - arrow diagonal
    d: 'M20,85 L80,15 M80,15 L55,15 M80,15 L80,42 ' +
       'M30,55 L60,55',
    viewBox: '0 0 100 100',
  },
  capricorn: {
    // Sea-goat - curved V with loop tail
    d: 'M15,15 L15,50 Q15,75 35,60 Q55,45 55,65 Q55,85 70,85 A12,12 0 1,0 70,61',
    viewBox: '0 0 100 100',
  },
  aquarius: {
    // Water bearer - two zigzag lines
    d: 'M10,35 L25,20 L40,35 L55,20 L70,35 L85,20 ' +
       'M10,60 L25,45 L40,60 L55,45 L70,60 L85,45',
    viewBox: '0 0 100 100',
  },
  pisces: {
    // Fish - two arcs connected by horizontal line
    d: 'M20,15 Q50,30 20,50 Q50,70 20,85 ' +
       'M80,15 Q50,30 80,50 Q50,70 80,85 ' +
       'M15,50 L85,50',
    viewBox: '0 0 100 100',
  },
};

// Indexed array for zodiac signs (matches traditional order starting from Aries)
const SIGN_ORDER = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;

export function getSignPathByIndex(index: number): { d: string; viewBox: string } | undefined {
  const name = SIGN_ORDER[index];
  return name ? SIGN_GLYPH_PATHS[name] : undefined;
}

export function getPlanetPath(planet: string): { d: string; viewBox: string } | undefined {
  return PLANET_GLYPH_PATHS[planet];
}

// 3-letter abbreviations for zodiac signs (used in text labels)
export const SIGN_ABBREVIATIONS: string[] = [
  'Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir',
  'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis',
];
