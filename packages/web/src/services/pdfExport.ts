import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { svg2pdf } from 'svg2pdf.js';
import type { Svg2pdfOptions } from 'svg2pdf.js';
import type { ChartResult, TransitResult, ZRTimeline, LotResult } from '@natal-chart/core';
import type { ExtendedBirthData, TransitLocation } from '../contexts/ChartContext';
import { getSignPathByIndex, getPlanetPath } from '../utils/astro-glyph-paths';

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

// PDF styling constants
const COLORS = {
  parchment: '#faf7f0',
  gold: '#b8860b',
  darkGold: '#8b6914',
  text: '#2c2c54',
  lightText: '#666666',
  accent: '#3366cc',
  error: '#cc3333',
  success: '#33cc66',
};

const FONTS = {
  title: 20,
  heading: 16,
  body: 12,
  small: 10,
  tableHeader: 11,
  tableBody: 10,
};

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
): Promise<jsPDF> {
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
    currentY = await addChartWheel(doc, chartSvgElement, currentY);
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
 * Add header with birth data summary
 */
function addHeader(doc: jsPDF, birthData: ExtendedBirthData, transitData?: TransitResult | undefined, transitLocation?: TransitLocation | undefined): number {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
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
  const dateStr = birthDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = birthDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC';

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
  startY: number
): Promise<number> {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  let y = startY;
  
  // Add section title
  doc.setFontSize(FONTS.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.darkGold);
  doc.text('Chart Wheel', margin, y);
  y += 8;
  
  try {
    // Create a temporary container for the SVG
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    
    // Set SVG size for PDF (fit within page width)
    const targetSize = pageWidth - (2 * margin);
    svgClone.setAttribute('width', `${targetSize}mm`);
    svgClone.setAttribute('height', `${targetSize}mm`);
    svgClone.setAttribute('viewBox', `0 0 800 800`);
    
    // Replace Unicode glyph <text> elements with SVG <path> elements
    // so svg2pdf renders them as native vectors (no font dependency).
    replaceGlyphTextWithPaths(svgClone);

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
  const margin = 15;
  let y = startY;
  
  // Add section title
  doc.setFontSize(FONTS.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.darkGold);
  doc.text('Planet Positions', margin, y);
  y += 8;
  
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
      cellPadding: 4,
      lineWidth: 0.5,
      lineColor: COLORS.gold,
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
    },
  });
  
  // Update Y position after table
  y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;
  return y;
}

/** Aspect definitions for ASC/MC grid calculations */
const ASPECT_DEFS: { angle: number; orb: number; type: string }[] = [
  { angle: 0, orb: 8, type: 'conjunction' },
  { angle: 180, orb: 8, type: 'opposition' },
  { angle: 120, orb: 6, type: 'trine' },
  { angle: 90, orb: 6, type: 'square' },
  { angle: 60, orb: 4, type: 'sextile' },
  { angle: 150, orb: 3, type: 'quincunx' },
  { angle: 30, orb: 2, type: 'semiSextile' },
];

const LUMINARY_ASPECT_DEFS: { angle: number; orb: number; type: string }[] = [
  { angle: 0, orb: 10, type: 'conjunction' },
  { angle: 180, orb: 10, type: 'opposition' },
  { angle: 120, orb: 10, type: 'trine' },
  { angle: 90, orb: 10, type: 'square' },
  { angle: 60, orb: 6, type: 'sextile' },
  { angle: 150, orb: 3, type: 'quincunx' },
  { angle: 30, orb: 2, type: 'semiSextile' },
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
  const margin = 15;
  let y = startY;

  // Check if we need a new page
  if (y > doc.internal.pageSize.height - 80) {
    doc.addPage();
    y = 20;
  }

  // Section title
  doc.setFontSize(FONTS.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.darkGold);
  doc.text('Aspects', margin, y);
  y += 8;

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
  const cellSize = 12; // mm
  const gridTotalWidth = n * cellSize;

  // Center the grid
  const pageWidth = doc.internal.pageSize.width;
  const gridX = (pageWidth - gridTotalWidth) / 2;

  // Check if grid fits on current page, otherwise add page
  const gridHeight = n * cellSize;
  if (y + gridHeight > doc.internal.pageSize.height - 20) {
    doc.addPage();
    y = 20;
  }

  const useGlyphFont = fontLoaded;

  // Draw the grid
  for (let row = 0; row < n; row++) {
    for (let col = 0; col <= row; col++) {
      const cx = gridX + col * cellSize;
      const cy = y + row * cellSize;

      if (row === col) {
        // Diagonal: planet label cell
        doc.setFillColor('#f5f0e8');
        doc.rect(cx, cy, cellSize, cellSize, 'FD');
        doc.setDrawColor('#d4c9a8');
        doc.rect(cx, cy, cellSize, cellSize, 'S');

        if (useGlyphFont && points[row]!.key !== 'asc' && points[row]!.key !== 'mc') {
          doc.setFont('DejaVuSans', 'normal');
          doc.setFontSize(9);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
        }
        doc.setTextColor(COLORS.text);
        doc.text(points[row]!.glyph, cx + cellSize / 2, cy + cellSize / 2 + 1.5, { align: 'center' });
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
          doc.setFontSize(8);
          doc.text(getAspectGlyph(asp.type), cx + cellSize / 2, cy + cellSize / 2 - 0.5, { align: 'center' });

          // Orb value below
          doc.setTextColor('#888888');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          doc.text(`${asp.orb.toFixed(1)}°`, cx + cellSize / 2, cy + cellSize / 2 + 3.5, { align: 'center' });
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
  const margin = 15;
  let y = startY;

  // Check if we need a new page
  if (y > doc.internal.pageSize.height - 60) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(FONTS.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.accent);

  const transitDate = new Date(transitData.dateTimeUtc);
  const transitDateStr = transitDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.text(`Transit Positions (${transitDateStr})`, margin, y);
  y += 8;

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
      cellPadding: 4,
      lineWidth: 0.5,
      lineColor: COLORS.accent,
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15, halign: 'center' },
    },
  });

  y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;
  return y;
}

/** Transit aspect definitions (tighter orbs, matching calculator.ts) */
const TRANSIT_ASPECT_DEFS_PDF: { angle: number; orb: number; type: string }[] = [
  { angle: 0, orb: 6, type: 'conjunction' },
  { angle: 180, orb: 6, type: 'opposition' },
  { angle: 120, orb: 4, type: 'trine' },
  { angle: 90, orb: 4, type: 'square' },
  { angle: 60, orb: 3, type: 'sextile' },
  { angle: 150, orb: 2, type: 'quincunx' },
  { angle: 30, orb: 1.5, type: 'semiSextile' },
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
  const margin = 15;
  let y = startY;

  // Check if we need a new page
  if (y > doc.internal.pageSize.height - 80) {
    doc.addPage();
    y = 20;
  }

  // Section title
  doc.setFontSize(FONTS.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.accent);
  doc.text('Natal-to-Transit Aspects', margin, y);
  y += 8;

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
  const cellSize = 10; // mm
  const headerCellH = 14; // mm - taller for sign+degree header
  const rowHeaderW = 10; // mm

  const nRows = natalRows.length;
  const nCols = transitCols.length;
  const gridTotalW = rowHeaderW + nCols * cellSize;
  const gridTotalH = headerCellH + nRows * cellSize;

  // Center the grid
  const pageWidth = doc.internal.pageSize.width;
  const gridX = Math.max(margin, (pageWidth - gridTotalW) / 2);

  // Check if grid fits on page
  if (y + gridTotalH > doc.internal.pageSize.height - 20) {
    doc.addPage();
    y = 20;
  }

  // Draw column headers (transit planets)
  for (let c = 0; c < nCols; c++) {
    const cx = gridX + rowHeaderW + c * cellSize;
    const cy = y;
    const col = transitCols[c]!;

    doc.setFillColor('#f5f0e8');
    doc.setDrawColor('#d4c9a8');
    doc.rect(cx, cy, cellSize, headerCellH, 'FD');

    // Planet glyph
    if (useGlyphFont) {
      doc.setFont('DejaVuSans', 'normal');
    } else {
      doc.setFont('helvetica', 'bold');
    }
    doc.setFontSize(7);
    doc.setTextColor(COLORS.text);
    doc.text(col.glyph, cx + cellSize / 2, cy + 4.5, { align: 'center' });

    // Sign glyph + degree
    if (useGlyphFont) {
      doc.setFont('DejaVuSans', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    doc.setFontSize(4.5);
    doc.setTextColor('#888888');
    doc.text(col.signGlyph, cx + cellSize / 2, cy + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4);
    doc.text(`${col.deg}°${col.min.toString().padStart(2, '0')}`, cx + cellSize / 2, cy + 11.5, { align: 'center' });
  }

  // Empty corner cell
  doc.setFillColor('#f5f0e8');
  doc.setDrawColor('#d4c9a8');
  doc.rect(gridX, y, rowHeaderW, headerCellH, 'FD');

  const bodyY = y + headerCellH;

  // Draw rows
  for (let r = 0; r < nRows; r++) {
    const row = natalRows[r]!;
    const ry = bodyY + r * cellSize;

    // Row header: natal planet glyph
    doc.setFillColor('#f5f0e8');
    doc.setDrawColor('#d4c9a8');
    doc.rect(gridX, ry, rowHeaderW, cellSize, 'FD');

    if (useGlyphFont && !row.isText) {
      doc.setFont('DejaVuSans', 'normal');
      doc.setFontSize(7);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
    }
    doc.setTextColor(COLORS.text);
    doc.text(row.glyph, gridX + rowHeaderW / 2, ry + cellSize / 2 + 1.5, { align: 'center' });

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
        doc.setFontSize(6);
        doc.text(getAspectGlyph(asp.type), cx + cellSize / 2, ry + cellSize / 2 - 0.5, { align: 'center' });

        // Orb
        doc.setTextColor('#888888');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(3.5);
        doc.text(`${asp.orb.toFixed(1)}°`, cx + cellSize / 2, ry + cellSize / 2 + 3, { align: 'center' });
      }
    }
  }

  y = bodyY + nRows * cellSize + 10;
  return y;
}

/**
 * Replace glyph <text> elements (marked with data-glyph attributes) with
 * SVG <path> elements so svg2pdf renders them as vectors without needing fonts.
 */
function replaceGlyphTextWithPaths(svg: SVGElement): void {
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
    const pathData = getSignPathByIndex(index);
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
    const pathData = getPlanetPath(planet);
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
  const margin = 15;
  let y = startY;

  // Check if we need a new page
  if (y > doc.internal.pageSize.height - 80) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(FONTS.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.darkGold);
  doc.text('Zodiacal Releasing', margin, y);
  y += 6;

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

// Helper functions for formatting
function getPlanetGlyph(planet: string): string {
  const glyphs: Record<string, string> = {
    sun: '☉',
    moon: '☽',
    mercury: '☿',
    venus: '♀',
    mars: '♂',
    jupiter: '♃',
    saturn: '♄',
    uranus: '♅',
    neptune: '♆',
    pluto: '⯓',
    northNode: '☊',
    chiron: '⚷',
    lilith: '⚸',
    fortune: '⊕',
    vertex: 'Vx',
  };
  return glyphs[planet] || '○';
}

function getSignGlyph(sign: string): string {
  const glyphs: Record<string, string> = {
    aries: '♈',
    taurus: '♉',
    gemini: '♊',
    cancer: '♋',
    leo: '♌',
    virgo: '♍',
    libra: '♎',
    scorpio: '♏',
    sagittarius: '♐',
    capricorn: '♑',
    aquarius: '♒',
    pisces: '♓',
  };
  return glyphs[sign] || '○';
}

function formatPlanetName(planet: string): string {
  const names: Record<string, string> = {
    northNode: 'North Node',
    lilith: 'Lilith',
    fortune: 'Fortune',
    vertex: 'Vertex',
  };
  if (names[planet]) return names[planet];
  return planet.charAt(0).toUpperCase() + planet.slice(1).replace(/([A-Z])/g, ' $1');
}

function formatSignName(sign: string): string {
  return sign.charAt(0).toUpperCase() + sign.slice(1);
}

function getAspectGlyph(aspectType: string): string {
  const glyphs: Record<string, string> = {
    conjunction: '☌',
    opposition: '☍',
    trine: '△',
    square: '□',
    sextile: '⚹',
    quincunx: '⚻',
    semiSextile: '⚺',
    parallel: '∥',
    contraparallel: '⊥',
  };
  return glyphs[aspectType] || '•';
}

function getAspectColor(aspectType: string): string {
  const colors: Record<string, string> = {
    conjunction: '#333333',
    opposition: '#cc3333',
    trine: '#3366cc',
    square: '#cc6633',
    sextile: '#33cc66',
    quincunx: '#9966cc',
    semiSextile: '#66cccc',
    parallel: '#cc3399',
    contraparallel: '#cc3399',
  };
  return colors[aspectType] || '#333333';
}