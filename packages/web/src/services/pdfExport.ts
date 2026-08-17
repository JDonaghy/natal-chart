import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { svg2pdf } from 'svg2pdf.js';
import type { Svg2pdfOptions } from 'svg2pdf.js';
import type { ChartResult, TransitResult, ZRTimeline, LotResult } from '@natal-chart/core';
import type { ExtendedBirthData, TransitLocation } from '../contexts/ChartContext';
import { getSignPathByIndex, getPlanetPath, DEFAULT_GLYPH_SET } from '../utils/astro-glyph-paths';
import { type ThemeColors } from '../utils/themes';
/**
 * Symbols come from the one shared table the screen also uses. This file used
 * to keep its own copy, and the two drifted (issue #28) — do not reintroduce a
 * PDF-local symbol map. The re-export below is what `pdfExport.test.ts` uses
 * to assert the PDF and the screen resolve symbols through the same functions.
 */
import {
  getPlanetGlyph,
  getSignGlyph,
  getAspectGlyph,
  getAspectColor,
  formatPlanetName,
  formatSignName,
} from '../utils/symbols';

export {
  getPlanetGlyph,
  getSignGlyph,
  getAspectGlyph,
  getAspectColor,
  formatPlanetName,
  formatSignName,
};

type JsPDFWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

/**
 * Load a TTF font from public/fonts/ and register it with jsPDF
 */
async function addFontToDoc(doc: jsPDF, fileName: string, fontName: string): Promise<boolean> {
  // Check if font already registered
  if (doc.existsFileInVFS && doc.existsFileInVFS(fileName)) {
    const fontList = doc.getFontList();
    if (fontList && fontList[fontName]) {
      return true;
    }
  }

  try {
    const fontUrl = `./fonts/${fileName}`;
    const response = await fetch(fontUrl, { mode: 'cors', credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error(`Failed to fetch font ${fileName}: ${response.status}`);
    }

    const fontBlob = await response.blob();
    const fontBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('Failed to read font as data URL'));
          return;
        }
        const base64 = result.split(',')[1];
        if (!base64) {
          reject(new Error('Invalid data URL format'));
          return;
        }
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(fontBlob);
    });

    doc.addFileToVFS(fileName, fontBase64);

    // Suppress jsPDF PubSub errors during font registration
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const message = args[0]?.toString() || '';
      if (message.includes('jsPDF PubSub Error')) return;
      originalConsoleError.apply(console, args);
    };

    try {
      doc.addFont(fileName, fontName, 'normal', 'Identity-H');
      // Also register as bold so autoTable/svg2pdf don't fail on bold lookups
      doc.addFont(fileName, fontName, 'bold', 'Identity-H');
    } catch {
      try {
        doc.addFont(fileName, fontName, 'normal');
        doc.addFont(fileName, fontName, 'bold');
      } catch {
        console.error = originalConsoleError;
        throw new Error(`Failed to register ${fontName} font with jsPDF`);
      }
    } finally {
      console.error = originalConsoleError;
    }

    const fontList = doc.getFontList();
    if (!fontList || !fontList[fontName]) {
      throw new Error(`${fontName} font not found in font list after registration`);
    }

    return true;
  } catch (error) {
    console.error(`Failed to add ${fontName} font:`, error);
    return false;
  }
}

// PDF styling constants — updated from theme at export time
let COLORS = {
  parchment: '#faf7f0',
  gold: '#b8860b',
  darkGold: '#8b6914',
  text: '#2c2c54',
  lightText: '#666666',
  accent: '#3366cc',
  error: '#cc3333',
  success: '#33cc66',
};

function applyThemeToColors(theme: ThemeColors): void {
  COLORS = {
    ...COLORS,
    parchment: theme.backgroundAlt,
    gold: theme.accent,
    darkGold: theme.accent,
    text: theme.textHeading,
  };
}

const FONTS = {
  title: 20,
  heading: 16,
  body: 12,
  small: 10,
  tableHeader: 11,
  tableBody: 10,
};

/** Shared left/right page margin (mm) used by every section on every page. */
const PAGE_MARGIN = 15;

/** Rough height (mm) of an autoTable header row + one body row at the default
 *  table font sizes/padding used in this document — enough to guarantee the
 *  first row of a table lands on the same page as its section heading. */
const MIN_TABLE_FIRST_ROW_HEIGHT = 24;

/**
 * Ensure `requiredHeight` mm of vertical space remains below `y` before the
 * footer (`pageHeight - PAGE_MARGIN`); if it doesn't, start a fresh page.
 * Returns the y position to draw at (either the original `y`, or the top
 * margin of a new page).
 *
 * This is the single guard every section heading routes through so a heading
 * can never be emitted on a page that has no room for its content.
 */
function ensureSpace(doc: jsPDF, y: number, requiredHeight: number): number {
  const pageHeight = doc.internal.pageSize.height;
  if (y + requiredHeight > pageHeight - PAGE_MARGIN) {
    doc.addPage();
    return 20;
  }
  return y;
}

/**
 * Start a section: reserve space for the heading plus `requiredHeight` mm of
 * content (breaking to a new page first if it won't fit), then draw the
 * heading. Returns the y position for the section's content.
 */
function startSection(doc: jsPDF, title: string, y: number, requiredHeight: number, color: string): number {
  // The heading itself needs roughly 0.4x its font size in vertical space
  // below the text baseline before the content starts (jsPDF draws text with
  // `y` at the baseline, and startSection returns `y + 8` for the content —
  // 0.4 * FONTS.heading (16pt) ≈ 6.4mm, comfortably under that 8mm step so
  // the heading's descenders never crowd the first row of content).
  y = ensureSpace(doc, y, FONTS.heading * 0.4 + requiredHeight);

  doc.setFontSize(FONTS.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(color);
  doc.text(title, PAGE_MARGIN, y);
  return y + 8;
}

/**
 * Compute the left x of a grid of `contentWidth` mm centred within the page,
 * clamped so it never sits inside either the left or right margin — i.e. the
 * grid's left edge is never left of `margin` and its right edge is never
 * right of `pageWidth - margin`.
 */
function clampCenteredX(pageWidth: number, contentWidth: number, margin: number): number {
  const centered = (pageWidth - contentWidth) / 2;
  return Math.min(Math.max(centered, margin), Math.max(margin, pageWidth - margin - contentWidth));
}

/**
 * Generate a PDF of the natal chart with all data
 */
export async function generateChartPdf(
  chartData: ChartResult,
  birthData: ExtendedBirthData,
  chartSvgElement: SVGElement | null,
  transitData?: TransitResult | undefined,
  transitLocation?: TransitLocation | undefined,
  releasingData?: { lots: LotResult; timeline: ZRTimeline } | undefined,
  glyphSet?: string | undefined,
  theme?: ThemeColors | undefined,
): Promise<jsPDF> {
  if (theme) applyThemeToColors(theme);
  // Create PDF document in portrait orientation (A4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Load fonts: DejaVuSans for astrological glyphs, Cormorant for degree/minute labels
  let fontLoaded: boolean;
  try {
    const [dejaVuLoaded, cormorantLoaded] = await Promise.all([
      addFontToDoc(doc, 'DejaVuSans.ttf', 'DejaVuSans'),
      addFontToDoc(doc, 'Cormorant-Regular.ttf', 'Cormorant'),
    ]);
    fontLoaded = dejaVuLoaded;
    if (!cormorantLoaded) {
      console.warn('Cormorant font not loaded, PDF degree/minute labels will use default font');
    }
  } catch (error) {
    console.error('Failed to load fonts:', error);
    fontLoaded = false;
  }

  // Set document properties
  const hasTransits = !!transitData;
  const docTitle = hasTransits ? 'Natal Chart with Transits' : 'Natal Chart';
  doc.setProperties({
    title: docTitle,
    subject: 'Astrological birth chart',
    creator: 'Natal Chart Calculator',
    author: birthData.city || 'Unknown location',
  });

  // Add header with title and birth info
  let currentY = addHeader(doc, birthData, transitData, transitLocation);
  
  // Add chart wheel if SVG element is provided
  if (chartSvgElement) {
    currentY = await addChartWheel(doc, chartSvgElement, currentY, glyphSet);
  }
  
  // Add planet positions table
  currentY = addPlanetTable(doc, chartData, currentY, fontLoaded);
  
  // Add aspects table (if any)
  if (chartData.aspects.length > 0) {
    currentY = addAspectTable(doc, chartData, currentY, fontLoaded);
  }

  // Add transit data if present
  if (transitData) {
    currentY = addTransitPlanetTable(doc, transitData, currentY, fontLoaded);
    currentY = addTransitAspectGrid(doc, chartData, transitData, currentY, fontLoaded);
  }

  // Add releasing data if present
  if (releasingData) {
    currentY = addReleasingSummary(doc, releasingData.lots, releasingData.timeline, currentY, fontLoaded);
  }
  void currentY;
  
  // Add footer with timestamp and page numbers
  addFooter(doc);
  
  return doc;
}

/**
 * Format a date as a `{ date, time }` pair in the given IANA timezone,
 * falling back to UTC when the zone is missing or not recognised by the
 * runtime's Intl data.
 */
function formatInZone(date: Date, timeZone: string | undefined): { date: string; time: string } {
  const zone = timeZone || 'UTC';
  try {
    return {
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: zone }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: zone }),
    };
  } catch {
    return {
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
    };
  }
}

/**
 * Add header with birth data summary
 */
function addHeader(doc: jsPDF, birthData: ExtendedBirthData, transitData?: TransitResult | undefined, transitLocation?: TransitLocation | undefined): number {
  const pageWidth = doc.internal.pageSize.width;
  const margin = PAGE_MARGIN;
  const hasTransits = !!transitData;

  // Background color for header
  doc.setFillColor(COLORS.parchment);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Title
  doc.setFontSize(FONTS.title);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.darkGold);
  doc.text(hasTransits ? 'Natal Chart with Transits' : 'Natal Chart', pageWidth / 2, 20, { align: 'center' });

  // Birth date and time
  doc.setFontSize(FONTS.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.text);

  const birthDate = new Date(birthData.dateTimeUtc);
  // Show the local birth time alongside UTC (issue #28). The calendar date is
  // rendered in the birth timezone too, so a birth that crosses midnight in
  // UTC doesn't print a date that contradicts the local time beside it.
  const local = formatInZone(birthDate, birthData.timezone);
  const utcTime = formatInZone(birthDate, 'UTC').time;
  const dateStr = local.date;
  const timeStr = local.time && local.time !== utcTime
    ? `${local.time} local (${utcTime} UTC)`
    : `${utcTime} UTC`;

  doc.text(`Birth: ${dateStr} at ${timeStr}`, margin, 35);

  // Location and house system
  const locationText = `Location: ${birthData.city || `${birthData.latitude.toFixed(4)}°, ${birthData.longitude.toFixed(4)}°`}`;
  const timezoneText = birthData.timezone ? `Timezone: ${birthData.timezone}` : '';
  const houseSystemText = `House System: ${
    birthData.houseSystem === 'P' ? 'Placidus' : 'Whole Sign'
  }`;

  doc.setFontSize(FONTS.small);
  doc.setTextColor(COLORS.lightText);
  doc.text(locationText, margin, 45);

  let nextY = 50;
  if (timezoneText) {
    doc.text(timezoneText, margin, nextY);
    nextY += 5;
  }

  doc.text(houseSystemText, margin, nextY);
  nextY += 5;

  // Transit date info
  if (hasTransits && transitData) {
    const transitDate = new Date(transitData.dateTimeUtc);
    const transitDateStr = transitDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const transitTimeStr = transitDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.setTextColor(COLORS.accent);
    const transitCityStr = transitLocation ? ` — ${transitLocation.city}` : '';
    doc.text(`Transits: ${transitDateStr} at ${transitTimeStr}${transitCityStr}`, margin, nextY);
    nextY += 5;
  }

  // Add decorative line
  doc.setDrawColor(COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(margin, nextY + 2, pageWidth - margin, nextY + 2);

  // Return Y position for next content
  return nextY + 12;
}

/**
 * Add chart wheel SVG to PDF
 */
async function addChartWheel(
  doc: jsPDF,
  svgElement: SVGElement,
  startY: number,
  glyphSet?: string | undefined,
): Promise<number> {
  const pageWidth = doc.internal.pageSize.width;
  const margin = PAGE_MARGIN;
  const targetSize = pageWidth - (2 * margin);

  // Add section title (breaks to a fresh page first if the wheel won't fit
  // underneath it on the current page)
  let y = startSection(doc, 'Chart Wheel', startY, targetSize, COLORS.darkGold);

  try {
    // Create a temporary container for the SVG
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    
    // Set SVG size for PDF (fit within page width)
    svgClone.setAttribute('width', `${targetSize}mm`);
    svgClone.setAttribute('height', `${targetSize}mm`);
    svgClone.setAttribute('viewBox', `0 0 800 800`);
    
    // Replace Unicode glyph <text> elements with SVG <path> elements
    // so svg2pdf renders them as native vectors (no font dependency).
    replaceGlyphTextWithPaths(svgClone, glyphSet);

    // Print the wheel in colour on a white background with black house
    // numbers (issue #28).
    applyPrintColors(svgClone);

    // Normalize font-family on remaining text elements so svg2pdf can
    // match them to jsPDF-registered fonts (strip CSS quotes and fallbacks).
    // Also replace Unicode prime ′ (U+2032) with ASCII apostrophe '
    // because svg2pdf's default font doesn't include the prime character.
    svgClone.querySelectorAll('text').forEach((el) => {
      if (el.textContent && el.textContent.includes('\u2032')) {
        el.textContent = el.textContent.replace(/\u2032/g, "'");
      }
      const ff = el.getAttribute('font-family');
      if (ff && ff.includes('Cormorant')) {
        el.setAttribute('font-family', 'Cormorant');
      }
    });
    // Also set the root SVG font-family to bare name for inheritance
    svgClone.style.fontFamily = 'Cormorant';

    // Convert SVG to PDF using svg2pdf
    console.log('svg2pdf function available?', typeof svg2pdf);
    if (typeof svg2pdf === 'function') {
      const x = margin;
      const options: Svg2pdfOptions = {
        x,
        y,
        width: targetSize,
        height: targetSize,
      };
      
      // Don't set font - let svg2pdf handle default font
      // doc.setFont(fontFamily, 'normal');
      
      // Use svg2pdf function
      await svg2pdf(svgClone, doc, options);
      
      // Update Y position
      y += targetSize + 10;
    } else {
      // Fallback: add placeholder text
      doc.setFontSize(FONTS.body);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.lightText);
      doc.text('Chart wheel SVG export requires svg2pdf plugin.', margin, y);
      y += 20;
    }
  } catch (error) {
    console.error('Failed to add chart wheel to PDF:', error);
    
    // Fallback: add error message
    doc.setFontSize(FONTS.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.error);
    doc.text('Unable to render chart wheel in PDF.', margin, y);
    y += 20;
  }
  
  return y;
}

/**
 * Add planet positions table
 */
function addPlanetTable(doc: jsPDF, chartData: ChartResult, startY: number, fontLoaded: boolean = false): number {
  // Add section title (breaks to a fresh page first if there isn't room for
  // the heading plus at least the table header + first data row underneath it)
  let y = startSection(doc, 'Planet Positions', startY, MIN_TABLE_FIRST_ROW_HEIGHT, COLORS.darkGold);

  // Set font for table based on font availability
  if (fontLoaded) {
    doc.setFont('DejaVuSans', 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }
  
  // Prepare table data with glyphs if font available
  const tableData = chartData.planets.map(planet => [
    fontLoaded ? getPlanetGlyph(planet.planet) + ' ' + formatPlanetName(planet.planet) : formatPlanetName(planet.planet),
    fontLoaded ? getSignGlyph(planet.sign) + ' ' + formatSignName(planet.sign) : formatSignName(planet.sign),
    `${planet.degree}° ${planet.minute}′`,
    planet.house.toString(),
    planet.retrograde ? 'R' : '',
  ]);
  
  // Create table
  autoTable(doc, {
    startY: y,
    head: [['Planet', 'Sign', 'Position', 'House', 'Retro']],
    body: tableData,
    headStyles: {
      fillColor: COLORS.gold,
      textColor: '#ffffff',
      fontStyle: 'bold',
      fontSize: FONTS.tableHeader,
      ...(fontLoaded ? { font: 'DejaVuSans' } : {}),
    },
    bodyStyles: {
      fontSize: FONTS.tableBody,
      textColor: COLORS.text,
      ...(fontLoaded ? { font: 'DejaVuSans' } : {}),
    },
    alternateRowStyles: {
      fillColor: '#f9f5eb',
    },
    styles: {
      cellPadding: 3,
      lineWidth: 0.5,
      lineColor: COLORS.gold,
    },
    // "House" and "Retro" need ~11mm of text width at the 11pt header size;
    // at the old 15mm width minus 2x4mm padding they only had 7mm and wrapped
    // onto two lines (issue #28). Widened to 20mm with 3mm padding so each
    // header sits on one line. Total 138mm still clears the 180mm content box.
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold' },
      1: { cellWidth: 34 },
      2: { cellWidth: 28 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
    },
  });
  
  // Update Y position after table
  y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;
  return y;
}

/**
 * Aspect-grid type sizes, in points at the full 12mm cell size (they are
 * multiplied by `fontScale = cellSize / maxCellSize` when the grid shrinks).
 *
 * These were sized to fill their boxes in issue #28 — the symbols previously
 * floated in the middle of a mostly-empty cell. A 12mm cell is ~34pt tall, so
 * a 14pt glyph with a ~10pt cap height uses roughly 60% of the cell height and
 * still leaves room for the orb value underneath.
 */
const GRID_ASPECT_GLYPH_PT = 14;
const GRID_ORB_PT = 6;
const GRID_DIAGONAL_GLYPH_PT = 13;
const GRID_DIAGONAL_TEXT_PT = 9;

/** Same sizes for the narrower (10mm) natal-to-transit grid cells. */
const TRANSIT_GRID_ASPECT_GLYPH_PT = 11;
const TRANSIT_GRID_ORB_PT = 4.5;
const TRANSIT_GRID_HEADER_GLYPH_PT = 9;
const TRANSIT_GRID_HEADER_TEXT_PT = 7;

/** Aspect definitions for ASC/MC grid calculations.
 *  Ptolemaic aspects only — see AspectType in core/types.ts (issue #28). */
const ASPECT_DEFS: { angle: number; orb: number; type: string }[] = [
  { angle: 0, orb: 8, type: 'conjunction' },
  { angle: 180, orb: 8, type: 'opposition' },
  { angle: 120, orb: 6, type: 'trine' },
  { angle: 90, orb: 6, type: 'square' },
  { angle: 60, orb: 4, type: 'sextile' },
];

const LUMINARY_ASPECT_DEFS: { angle: number; orb: number; type: string }[] = [
  { angle: 0, orb: 10, type: 'conjunction' },
  { angle: 180, orb: 10, type: 'opposition' },
  { angle: 120, orb: 10, type: 'trine' },
  { angle: 90, orb: 10, type: 'square' },
  { angle: 60, orb: 6, type: 'sextile' },
];

const PDF_LUMINARIES = new Set(['sun', 'moon']);

function findAspectByLongitude(lon1: number, lon2: number, isLuminary: boolean): { type: string; orb: number } | null {
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

/**
 * Add aspect grid (triangular aspectarian) to PDF
 */
function addAspectTable(doc: jsPDF, chartData: ChartResult, startY: number, fontLoaded: boolean = false): number {
  const margin = PAGE_MARGIN;

  // Build grid points: planets + ASC + MC
  interface GridPoint { key: string; label: string; glyph: string; longitude: number }
  const points: GridPoint[] = chartData.planets.map(p => ({
    key: p.planet,
    label: formatPlanetName(p.planet),
    glyph: getPlanetGlyph(p.planet),
    longitude: p.longitude,
  }));
  points.push(
    { key: 'asc', label: 'AC', glyph: 'AC', longitude: chartData.angles.ascendant },
    { key: 'mc', label: 'MC', glyph: 'MC', longitude: chartData.angles.midheaven },
  );

  // Build aspect lookup from pre-computed aspects
  const aspectMap = new Map<string, { type: string; orb: number }>();
  for (const a of chartData.aspects) {
    aspectMap.set(`${a.planet1}|${a.planet2}`, { type: a.type, orb: a.orb });
    aspectMap.set(`${a.planet2}|${a.planet1}`, { type: a.type, orb: a.orb });
  }

  function getGridAspect(keyA: string, keyB: string): { type: string; orb: number } | null {
    const existing = aspectMap.get(`${keyA}|${keyB}`);
    if (existing) return existing;
    const ptA = points.find(p => p.key === keyA);
    const ptB = points.find(p => p.key === keyB);
    if (!ptA || !ptB) return null;
    const isLuminary = PDF_LUMINARIES.has(keyA) || PDF_LUMINARIES.has(keyB);
    return findAspectByLongitude(ptA.longitude, ptB.longitude, isLuminary);
  }

  const n = points.length;
  const pageWidth = doc.internal.pageSize.width;
  // Shrink cells (rather than centering an oversized grid) so the grid never
  // exceeds the same 15mm margins every other section uses.
  const cellSize = Math.min(12, (pageWidth - 2 * margin) / n); // mm
  const gridTotalWidth = n * cellSize;
  const gridHeight = n * cellSize;
  const gridX = clampCenteredX(pageWidth, gridTotalWidth, margin);
  // Scale glyph/orb font sizes down with the cell so text keeps clear of
  // the (now possibly smaller) cell borders.
  const fontScale = cellSize / 12;

  // Section title (breaks to a fresh page first if the whole grid — heading
  // included — won't fit on the current page)
  let y = startSection(doc, 'Aspects', startY, gridHeight, COLORS.darkGold);

  const useGlyphFont = fontLoaded;

  // Draw the grid
  for (let row = 0; row < n; row++) {
    for (let col = 0; col <= row; col++) {
      const cx = gridX + col * cellSize;
      const cy = y + row * cellSize;

      if (row === col) {
        // Diagonal: planet label cell
        doc.setFillColor(COLORS.parchment);
        doc.rect(cx, cy, cellSize, cellSize, 'FD');
        doc.setDrawColor('#d4c9a8');
        doc.rect(cx, cy, cellSize, cellSize, 'S');

        if (useGlyphFont && points[row]!.key !== 'asc' && points[row]!.key !== 'mc') {
          doc.setFont('DejaVuSans', 'normal');
          doc.setFontSize(GRID_DIAGONAL_GLYPH_PT * fontScale);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(GRID_DIAGONAL_TEXT_PT * fontScale);
        }
        doc.setTextColor(COLORS.text);
        doc.text(points[row]!.glyph, cx + cellSize / 2, cy + cellSize / 2 + 1.5 * fontScale, { align: 'center' });
      } else {
        // Lower-left triangle: aspect cell
        const asp = getGridAspect(points[row]!.key, points[col]!.key);

        doc.setDrawColor('#d4c9a8');
        if (asp) {
          doc.setFillColor('#ffffff');
        } else {
          doc.setFillColor('#faf7f0');
        }
        doc.rect(cx, cy, cellSize, cellSize, 'FD');

        if (asp) {
          // Aspect glyph
          const color = getAspectColor(asp.type);
          doc.setTextColor(color);
          if (useGlyphFont) {
            doc.setFont('DejaVuSans', 'normal');
          } else {
            doc.setFont('helvetica', 'normal');
          }
          doc.setFontSize(GRID_ASPECT_GLYPH_PT * fontScale);
          doc.text(getAspectGlyph(asp.type), cx + cellSize / 2, cy + cellSize / 2 - 0.8 * fontScale, { align: 'center' });

          // Orb value below
          doc.setTextColor('#888888');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(GRID_ORB_PT * fontScale);
          doc.text(`${asp.orb.toFixed(1)}°`, cx + cellSize / 2, cy + cellSize / 2 + 3.8 * fontScale, { align: 'center' });
        }
      }
    }
  }

  y += gridHeight + 10;
  return y;
}

/**
 * Add transit planet positions table
 */
function addTransitPlanetTable(doc: jsPDF, transitData: TransitResult, startY: number, fontLoaded: boolean = false): number {
  const transitDate = new Date(transitData.dateTimeUtc);
  const transitDateStr = transitDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Add section title (breaks to a fresh page first if there isn't room for
  // the heading plus at least the table header + first data row underneath it)
  let y = startSection(doc, `Transit Positions (${transitDateStr})`, startY, MIN_TABLE_FIRST_ROW_HEIGHT, COLORS.accent);

  if (fontLoaded) {
    doc.setFont('DejaVuSans', 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }

  const tableData = transitData.planets.map(planet => [
    fontLoaded ? getPlanetGlyph(planet.planet) + ' ' + formatPlanetName(planet.planet) : formatPlanetName(planet.planet),
    fontLoaded ? getSignGlyph(planet.sign) + ' ' + formatSignName(planet.sign) : formatSignName(planet.sign),
    `${planet.degree}° ${planet.minute}′`,
    planet.retrograde ? 'R' : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Planet', 'Sign', 'Position', 'Retro']],
    body: tableData,
    headStyles: {
      fillColor: COLORS.accent,
      textColor: '#ffffff',
      fontStyle: 'bold',
      fontSize: FONTS.tableHeader,
      ...(fontLoaded ? { font: 'DejaVuSans' } : {}),
    },
    bodyStyles: {
      fontSize: FONTS.tableBody,
      textColor: COLORS.text,
      ...(fontLoaded ? { font: 'DejaVuSans' } : {}),
    },
    alternateRowStyles: {
      fillColor: '#f0f7ff',
    },
    styles: {
      cellPadding: 3,
      lineWidth: 0.5,
      lineColor: COLORS.accent,
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold' },
      1: { cellWidth: 34 },
      2: { cellWidth: 28 },
      3: { cellWidth: 20, halign: 'center' },
    },
  });

  y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;
  return y;
}

/** Transit aspect definitions (tighter orbs, matching calculator.ts).
 *  Ptolemaic aspects only — see AspectType in core/types.ts (issue #28). */
const TRANSIT_ASPECT_DEFS_PDF: { angle: number; orb: number; type: string }[] = [
  { angle: 0, orb: 6, type: 'conjunction' },
  { angle: 180, orb: 6, type: 'opposition' },
  { angle: 120, orb: 4, type: 'trine' },
  { angle: 90, orb: 4, type: 'square' },
  { angle: 60, orb: 3, type: 'sextile' },
];

function findTransitAspectByLon(natalLon: number, transitLon: number): { type: string; orb: number } | null {
  let diff = Math.abs(natalLon - transitLon);
  if (diff > 180) diff = 360 - diff;
  for (const def of TRANSIT_ASPECT_DEFS_PDF) {
    if (Math.abs(diff - def.angle) <= def.orb) {
      return { type: def.type, orb: Math.abs(diff - def.angle) };
    }
  }
  return null;
}

/**
 * Add natal-to-transit aspect grid (rectangular) to PDF
 */
function addTransitAspectGrid(
  doc: jsPDF,
  chartData: ChartResult,
  transitData: TransitResult,
  startY: number,
  fontLoaded: boolean = false,
): number {
  const margin = PAGE_MARGIN;

  // Build natal rows: planets + ASC + MC
  interface GridRow { key: string; glyph: string; longitude: number; isText: boolean }
  const natalRows: GridRow[] = chartData.planets.map(p => ({
    key: p.planet,
    glyph: getPlanetGlyph(p.planet),
    longitude: p.longitude,
    isText: p.planet === 'vertex',
  }));
  natalRows.push(
    { key: 'asc', glyph: 'AC', longitude: chartData.angles.ascendant, isText: true },
    { key: 'mc', glyph: 'MC', longitude: chartData.angles.midheaven, isText: true },
  );

  // Build transit columns
  interface GridCol { key: string; glyph: string; signGlyph: string; deg: number; min: number; longitude: number }
  const transitCols: GridCol[] = transitData.planets.map(p => ({
    key: p.planet,
    glyph: getPlanetGlyph(p.planet),
    signGlyph: getSignGlyph(p.sign),
    deg: p.degree,
    min: p.minute,
    longitude: p.longitude,
  }));

  // Aspect lookup from pre-computed transit aspects
  const aspectMap = new Map<string, { type: string; orb: number }>();
  for (const a of transitData.aspects) {
    aspectMap.set(`${a.natalPlanet}|${a.transitPlanet}`, { type: a.type, orb: a.orb });
  }

  function getAspect(natalKey: string, transitKey: string, natalLon: number, transitLon: number): { type: string; orb: number } | null {
    const existing = aspectMap.get(`${natalKey}|${transitKey}`);
    if (existing) return existing;
    return findTransitAspectByLon(natalLon, transitLon);
  }

  const useGlyphFont = fontLoaded;
  const maxCellSize = 10; // mm
  const pageWidth = doc.internal.pageSize.width;
  // Shrink the cells (rather than only clamping the x offset) so the grid's
  // total width — row-header column plus one column per transit planet —
  // never exceeds the same 15mm side margins used everywhere else. This
  // mirrors the fix applied to the natal aspect grid in addAspectTable().
  const nRows = natalRows.length;
  const nCols = transitCols.length;
  const cellSize = Math.min(maxCellSize, (pageWidth - 2 * margin) / (nCols + 1));
  const rowHeaderW = cellSize;
  const headerCellH = 14 * (cellSize / maxCellSize); // mm - taller for sign+degree header
  // Scale glyph/orb/label font sizes down with the cell so text keeps clear
  // of the (now possibly smaller) cell borders.
  const fontScale = cellSize / maxCellSize;

  const gridTotalW = rowHeaderW + nCols * cellSize;
  const gridTotalH = headerCellH + nRows * cellSize;

  // Center the grid, clamped within the shared page margins
  const gridX = clampCenteredX(pageWidth, gridTotalW, margin);

  // Section title (breaks to a fresh page first if the whole grid — heading
  // included — won't fit on the current page)
  let y = startSection(doc, 'Natal-to-Transit Aspects', startY, gridTotalH, COLORS.accent);

  // Draw column headers (transit planets)
  for (let c = 0; c < nCols; c++) {
    const cx = gridX + rowHeaderW + c * cellSize;
    const cy = y;
    const col = transitCols[c]!;

    doc.setFillColor(COLORS.parchment);
    doc.setDrawColor('#d4c9a8');
    doc.rect(cx, cy, cellSize, headerCellH, 'FD');

    // Planet glyph
    if (useGlyphFont) {
      doc.setFont('DejaVuSans', 'normal');
    } else {
      doc.setFont('helvetica', 'bold');
    }
    doc.setFontSize(TRANSIT_GRID_HEADER_GLYPH_PT * fontScale);
    doc.setTextColor(COLORS.text);
    doc.text(col.glyph, cx + cellSize / 2, cy + 4.5 * fontScale, { align: 'center' });

    // Sign glyph + degree
    if (useGlyphFont) {
      doc.setFont('DejaVuSans', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    doc.setFontSize(4.5 * fontScale);
    doc.setTextColor('#888888');
    doc.text(col.signGlyph, cx + cellSize / 2, cy + 8 * fontScale, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4 * fontScale);
    doc.text(`${col.deg}°${col.min.toString().padStart(2, '0')}`, cx + cellSize / 2, cy + 11.5 * fontScale, { align: 'center' });
  }

  // Empty corner cell
  doc.setFillColor(COLORS.parchment);
  doc.setDrawColor('#d4c9a8');
  doc.rect(gridX, y, rowHeaderW, headerCellH, 'FD');

  const bodyY = y + headerCellH;

  // Draw rows
  for (let r = 0; r < nRows; r++) {
    const row = natalRows[r]!;
    const ry = bodyY + r * cellSize;

    // Row header: natal planet glyph
    doc.setFillColor(COLORS.parchment);
    doc.setDrawColor('#d4c9a8');
    doc.rect(gridX, ry, rowHeaderW, cellSize, 'FD');

    if (useGlyphFont && !row.isText) {
      doc.setFont('DejaVuSans', 'normal');
      doc.setFontSize(TRANSIT_GRID_HEADER_GLYPH_PT * fontScale);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(TRANSIT_GRID_HEADER_TEXT_PT * fontScale);
    }
    doc.setTextColor(COLORS.text);
    doc.text(row.glyph, gridX + rowHeaderW / 2, ry + cellSize / 2 + 1.5 * fontScale, { align: 'center' });

    // Aspect cells
    for (let c = 0; c < nCols; c++) {
      const col = transitCols[c]!;
      const cx = gridX + rowHeaderW + c * cellSize;
      const asp = getAspect(row.key, col.key, row.longitude, col.longitude);

      doc.setDrawColor('#d4c9a8');
      if (asp) {
        doc.setFillColor('#ffffff');
      } else {
        doc.setFillColor('#faf7f0');
      }
      doc.rect(cx, ry, cellSize, cellSize, 'FD');

      if (asp) {
        // Aspect glyph
        const color = getAspectColor(asp.type);
        doc.setTextColor(color);
        if (useGlyphFont) {
          doc.setFont('DejaVuSans', 'normal');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.setFontSize(TRANSIT_GRID_ASPECT_GLYPH_PT * fontScale);
        doc.text(getAspectGlyph(asp.type), cx + cellSize / 2, ry + cellSize / 2 - 0.6 * fontScale, { align: 'center' });

        // Orb
        doc.setTextColor('#888888');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(TRANSIT_GRID_ORB_PT * fontScale);
        doc.text(`${asp.orb.toFixed(1)}°`, cx + cellSize / 2, ry + cellSize / 2 + 3.2 * fontScale, { align: 'center' });
      }
    }
  }

  y = bodyY + nRows * cellSize + 10;
  return y;
}

/** Wheel background colour in the PDF. See applyPrintColors(). */
const PRINT_BACKGROUND = '#ffffff';
/** House-number colour in the PDF. See applyPrintColors(). */
const PRINT_HOUSE_NUMBER = '#000000';

/**
 * Recolour the *cloned* wheel for print (issue #28).
 *
 * Everything else keeps its on-screen colour — planets, aspect lines, sign
 * glyphs and zodiac segments all print in colour. Only two things change:
 *
 *  1. The background discs are flattened to solid white. On screen the inner
 *     disc is filled with `url(#parchmentGradient)`; svg2pdf's gradient
 *     support is unreliable and that is the most likely source of the
 *     washed-out grey wheel the customer reported.
 *  2. House numbers are forced to black, which the theme's body text colour
 *     is not guaranteed to be (and definitely isn't under a dark theme).
 *
 * ASSUMPTION (issue #28, open question): the customer's note about the wheel
 * background stops mid-sentence. We implement white background + black house
 * numbers; if that's wrong, the two constants above are the whole change.
 */
function applyPrintColors(svg: SVGElement): void {
  svg.querySelectorAll('[data-role="wheel-background"]').forEach((el) => {
    el.setAttribute('fill', PRINT_BACKGROUND);
  });
  svg.querySelectorAll('[data-role="house-number"]').forEach((el) => {
    el.setAttribute('fill', PRINT_HOUSE_NUMBER);
  });
}

/**
 * Replace glyph <text> elements (marked with data-glyph attributes) with
 * SVG <path> elements so svg2pdf renders them as vectors without needing fonts.
 */
function replaceGlyphTextWithPaths(svg: SVGElement, glyphSet: string = DEFAULT_GLYPH_SET): void {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Helper: compute transform from font-coordinate viewBox to target size
  function glyphTransform(
    pathData: { viewBox: string },
    x: number,
    y: number,
    sz: number,
  ): string {
    const parts = pathData.viewBox.split(' ').map(Number);
    const vbX = parts[0] ?? 0;
    const vbY = parts[1] ?? 0;
    const vbW = parts[2] ?? 100;
    const vbH = parts[3] ?? 100;
    const maxDim = Math.max(vbW, vbH);
    const scale = sz / maxDim;
    // Center the glyph: translate to (x,y) centered, scale down, then shift to viewBox origin
    const padX = (sz - vbW * scale) / 2;
    const padY = (sz - vbH * scale) / 2;
    return `translate(${x - sz / 2 + padX}, ${y - sz / 2 + padY}) scale(${scale}) translate(${-vbX}, ${-vbY})`;
  }

  // Replace zodiac sign glyphs
  svg.querySelectorAll('[data-glyph="zodiac"]').forEach((el) => {
    const index = parseInt(el.getAttribute('data-glyph-index') || '0', 10);
    const pathData = getSignPathByIndex(index, glyphSet);
    if (!pathData) return;

    const x = parseFloat(el.getAttribute('x') || '0');
    const y = parseFloat(el.getAttribute('y') || '0');
    const sz = parseFloat(el.getAttribute('font-size') || '20');
    const fill = el.getAttribute('fill') || '#5a4a3a';

    const pathEl = document.createElementNS(SVG_NS, 'path');
    pathEl.setAttribute('d', pathData.d);
    pathEl.setAttribute('transform', glyphTransform(pathData, x, y, sz));
    pathEl.setAttribute('fill', fill);

    el.parentNode?.replaceChild(pathEl, el);
  });

  // Replace planet glyphs
  svg.querySelectorAll('[data-glyph="planet"]').forEach((el) => {
    const planet = el.getAttribute('data-planet') || '';
    const pathData = getPlanetPath(planet, glyphSet);
    if (!pathData) return;

    const x = parseFloat(el.getAttribute('x') || '0');
    const y = parseFloat(el.getAttribute('y') || '0');
    const sz = parseFloat(el.getAttribute('font-size') || '20');
    const fill = el.getAttribute('fill') || '#5a4a3a';

    const pathEl = document.createElementNS(SVG_NS, 'path');
    pathEl.setAttribute('d', pathData.d);
    pathEl.setAttribute('transform', glyphTransform(pathData, x, y, sz));
    pathEl.setAttribute('fill', fill);

    el.parentNode?.replaceChild(pathEl, el);
  });
}

/**
 * Add zodiacal releasing summary to PDF
 */
function addReleasingSummary(
  doc: jsPDF,
  lots: LotResult,
  timeline: ZRTimeline,
  startY: number,
  fontLoaded: boolean = false,
): number {
  const margin = PAGE_MARGIN;

  // Add section title (breaks to a fresh page first if there isn't room for
  // the heading plus the lot-info line and at least the first table row)
  let y = startSection(doc, 'Zodiacal Releasing', startY, 6 + MIN_TABLE_FIRST_ROW_HEIGHT, COLORS.darkGold);

  // Lot info
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.lightText);

  const lotLabel = timeline.lot === 'fortune' ? 'Fortune' : 'Spirit';
  const lotSign = formatSignName(timeline.lotSign);
  const dayNight = lots.isDayBirth ? 'Day birth' : 'Night birth';
  doc.text(`${dayNight} • Lot of ${lotLabel} in ${lotSign} (${timeline.lotLongitude.toFixed(1)}°)`, margin, y);
  y += 6;

  if (fontLoaded) {
    doc.setFont('DejaVuSans', 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }

  // L1 periods table
  const tableData = timeline.periods.map(period => {
    const markers: string[] = [];
    if (period.isPeak) markers.push('Peak');
    if (period.isLoosingOfBond) markers.push('LB');
    return [
      fontLoaded
        ? getSignGlyph(period.sign) + ' ' + formatSignName(period.sign)
        : formatSignName(period.sign),
      formatPdfDate(period.startDate),
      formatPdfDate(period.endDate),
      `${(period.durationDays / 360).toFixed(0)}y`,
      markers.join(', '),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Sign', 'Start', 'End', 'Duration', 'Markers']],
    body: tableData,
    headStyles: {
      fillColor: COLORS.gold,
      textColor: '#ffffff',
      fontStyle: 'bold',
      fontSize: FONTS.tableHeader,
      ...(fontLoaded ? { font: 'DejaVuSans' } : {}),
    },
    bodyStyles: {
      fontSize: FONTS.tableBody,
      textColor: COLORS.text,
      ...(fontLoaded ? { font: 'DejaVuSans' } : {}),
    },
    alternateRowStyles: {
      fillColor: '#f9f5eb',
    },
    styles: {
      cellPadding: 3,
      lineWidth: 0.5,
      lineColor: COLORS.gold,
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
    },
  });

  y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;
  return y;
}

function formatPdfDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Add footer with timestamp and page numbers
 */
function addFooter(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.lightText);
  
  // Generated timestamp
  const now = new Date();
  const timestamp = now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  doc.text(`Generated: ${timestamp}`, 15, pageHeight - 15);
  
  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 25, pageHeight - 15);
  }
}

