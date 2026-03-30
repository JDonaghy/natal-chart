import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { svg2pdf } from 'svg2pdf.js';
import type { Svg2pdfOptions } from 'svg2pdf.js';
import type { ChartResult, TransitResult, ZRTimeline, LotResult } from '@natal-chart/core';
import type { ExtendedBirthData, TransitLocation } from '../contexts/ChartContext';
import { getSignPathByIndex, getPlanetPath } from '../utils/astro-glyph-paths';

type JsPDFWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

/**
 * Add DejaVuSans font to jsPDF instance if not already added
 */
async function addDejaVuFont(doc: jsPDF): Promise<boolean> {
  // Check if font already added to VFS
  if (doc.existsFileInVFS && doc.existsFileInVFS('DejaVuSans.ttf')) {
    console.log('DejaVuSans font already added to VFS');
    // Also check if font is registered
    const fontList = doc.getFontList();
    console.log('Available fonts:', fontList);
    if (fontList && fontList['DejaVuSans']) {
      console.log('DejaVuSans font already registered');
      return true;
    }
  }
  
  try {
    // Fetch font file from public directory
    const fontUrl = './fonts/DejaVuSans.ttf';
    console.log(`Loading font from ${fontUrl} (full URL: ${new URL(fontUrl, window.location.href).href})`);
    const response = await fetch(fontUrl, { mode: 'cors', credentials: 'same-origin' });
    console.log(`Font fetch response: ${response.status} ${response.statusText}, ok: ${response.ok}, type: ${response.type}, content-type: ${response.headers.get('content-type')}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.status} ${response.statusText}`);
    }
    
    const fontBlob = await response.blob();
    console.log(`Font blob size: ${fontBlob.size} bytes, type: ${fontBlob.type}`);
    const fontBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('Failed to read font as data URL'));
          return;
        }
        // Remove data:application/octet-stream;base64, prefix
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
    
    // Add font to jsPDF Virtual File System (VFS)
    doc.addFileToVFS('DejaVuSans.ttf', fontBase64);
    // Register the font - suppress jsPDF PubSub errors that appear in console
    const originalConsoleError = console.error;
    let jsPdfErrorOccurred = false;
    
    // Override console.error to capture and suppress jsPDF PubSub errors
    console.error = (...args: unknown[]) => {
      const message = args[0]?.toString() || '';
      if (message.includes('jsPDF PubSub Error')) {
        jsPdfErrorOccurred = true;
        console.log('Suppressed jsPDF PubSub Error during font registration');
        return;
      }
      // Pass through other errors
      originalConsoleError.apply(console, args);
    };
    
    try {
      // First try with encoding
      doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal', 'Identity-H');
    } catch (error) {
      console.log('First addFont attempt failed, trying without encoding:', error);
      try {
        // Try without encoding parameter
        doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
      } catch (error2) {
        console.log('Second addFont attempt failed, font may not be compatible:', error2);
        // Restore console.error before throwing
        console.error = originalConsoleError;
        throw new Error('Failed to register DejaVuSans font with jsPDF');
      }
    } finally {
      // Restore console.error
      console.error = originalConsoleError;
    }
    
    // Log if jsPDF error occurred but was suppressed
    if (jsPdfErrorOccurred) {
      console.log('jsPDF font parsing error occurred but was suppressed');
    }
    
    // Verify font was actually registered
    const fontList = doc.getFontList();
    console.log('Font list after adding:', fontList);
    if (!fontList || !fontList['DejaVuSans']) {
      throw new Error('DejaVuSans font not found in font list after registration');
    }
    
    console.log('DejaVuSans font added successfully to VFS');
    return true;
  } catch (error) {
    console.error('Failed to add DejaVuSans font:', error);
    // Fallback to ZapfDingbats
    console.log('Using ZapfDingbats as fallback');
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

  // Try to load DejaVuSans font for astrological symbols
  let fontLoaded: boolean;
  try {
    fontLoaded = await addDejaVuFont(doc);
    console.log('Font loading result:', fontLoaded ? 'success' : 'failed');
  } catch (error) {
    console.error('Failed to load DejaVuSans font, using fallback without symbols:', error);
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
    if (transitData.aspects.length > 0) {
      currentY = addTransitAspectTable(doc, transitData, currentY, fontLoaded);
    }
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
    birthData.houseSystem === 'P' ? 'Placidus' :
    birthData.houseSystem === 'W' ? 'Whole Sign' : 'Koch'
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
    },
    bodyStyles: {
      fontSize: FONTS.tableBody,
      textColor: COLORS.text,
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

/**
 * Add aspects table
 */
function addAspectTable(doc: jsPDF, chartData: ChartResult, startY: number, fontLoaded: boolean = false): number {
  const margin = 15;
  let y = startY;
  
  // Add section title
  doc.setFontSize(FONTS.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.darkGold);
  doc.text('Aspects', margin, y);
  y += 8;
  
  // Set font for table based on font availability
  if (fontLoaded) {
    doc.setFont('DejaVuSans', 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }
  
  // Prepare table data with glyphs if font available
  const tableData = chartData.aspects.map(aspect => [
    fontLoaded ? getPlanetGlyph(aspect.planet1) + ' ' + formatPlanetName(aspect.planet1) : formatPlanetName(aspect.planet1),
    fontLoaded ? getPlanetGlyph(aspect.planet2) + ' ' + formatPlanetName(aspect.planet2) : formatPlanetName(aspect.planet2),
    formatAspectName(aspect.type),
    `${aspect.orb.toFixed(1)}°`,
    aspect.applying ? 'Applying' : 'Separating',
  ]);
  
  // Create table
  autoTable(doc, {
    startY: y,
    head: [['Planet 1', 'Planet 2', 'Aspect', 'Orb', 'Applying']],
    body: tableData,
    headStyles: {
      fillColor: COLORS.accent,
      textColor: '#ffffff',
      fontStyle: 'bold',
      fontSize: FONTS.tableHeader,
    },
    bodyStyles: {
      fontSize: FONTS.tableBody,
      textColor: COLORS.text,
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
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
    },
  });
  
  // Update Y position after table
  y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;
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
    },
    bodyStyles: {
      fontSize: FONTS.tableBody,
      textColor: COLORS.text,
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

/**
 * Add natal-to-transit aspects table
 */
function addTransitAspectTable(doc: jsPDF, transitData: TransitResult, startY: number, fontLoaded: boolean = false): number {
  const margin = 15;
  let y = startY;

  if (y > doc.internal.pageSize.height - 60) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(FONTS.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.accent);
  doc.text('Natal-to-Transit Aspects', margin, y);
  y += 8;

  if (fontLoaded) {
    doc.setFont('DejaVuSans', 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }

  const tableData = transitData.aspects.map(aspect => [
    fontLoaded ? getPlanetGlyph(aspect.natalPlanet) + ' ' + formatPlanetName(aspect.natalPlanet) : formatPlanetName(aspect.natalPlanet),
    fontLoaded ? getPlanetGlyph(aspect.transitPlanet) + ' ' + formatPlanetName(aspect.transitPlanet) : formatPlanetName(aspect.transitPlanet),
    formatAspectName(aspect.type),
    `${aspect.orb.toFixed(1)}°`,
    aspect.applying ? 'Applying' : 'Separating',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Natal', 'Transit', 'Aspect', 'Orb', 'Applying']],
    body: tableData,
    headStyles: {
      fillColor: '#4A6B8A',
      textColor: '#ffffff',
      fontStyle: 'bold',
      fontSize: FONTS.tableHeader,
    },
    bodyStyles: {
      fontSize: FONTS.tableBody,
      textColor: COLORS.text,
    },
    alternateRowStyles: {
      fillColor: '#f0f4f8',
    },
    styles: {
      cellPadding: 4,
      lineWidth: 0.5,
      lineColor: '#4A6B8A',
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
    },
  });

  y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;
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
      `${(period.durationDays / 365.25).toFixed(0)}y`,
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
    },
    bodyStyles: {
      fontSize: FONTS.tableBody,
      textColor: COLORS.text,
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
    pluto: '♇',
    northNode: '☊',
    chiron: '⚷',
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
  return planet.charAt(0).toUpperCase() + planet.slice(1).replace(/([A-Z])/g, ' $1');
}

function formatSignName(sign: string): string {
  return sign.charAt(0).toUpperCase() + sign.slice(1);
}

function formatAspectName(aspectType: string): string {
  return aspectType.charAt(0).toUpperCase() + aspectType.slice(1);
}