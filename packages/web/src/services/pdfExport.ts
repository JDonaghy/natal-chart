import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { svg2pdf } from 'svg2pdf.js';
import type { Svg2pdfOptions } from 'svg2pdf.js';
import type { ChartResult } from '@natal-chart/core';
import type { ExtendedBirthData } from '../contexts/ChartContext';

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
    console.error = (...args: any[]) => {
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
  chartSvgElement: SVGElement | null
): Promise<jsPDF> {
  // Create PDF document in portrait orientation (A4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Try to load DejaVuSans font for astrological symbols
  let fontLoaded = false;
  try {
    fontLoaded = await addDejaVuFont(doc);
    console.log('Font loading result:', fontLoaded ? 'success' : 'failed');
  } catch (error) {
    console.error('Failed to load DejaVuSans font, using fallback without symbols:', error);
    fontLoaded = false;
  }

  // Set document properties
  doc.setProperties({
    title: 'Natal Chart',
    subject: 'Astrological birth chart',
    creator: 'Natal Chart Calculator',
    author: birthData.city || 'Unknown location',
  });

  // Add header with title and birth info
  let currentY = addHeader(doc, birthData);
  
  // Add chart wheel if SVG element is provided
  if (chartSvgElement) {
    currentY = await addChartWheel(doc, chartSvgElement, currentY);
  }
  
  // Add planet positions table
  currentY = addPlanetTable(doc, chartData, currentY, fontLoaded);
  
  // Add aspects table (if any)
  if (chartData.aspects.length > 0) {
    // No need to capture returned Y as we're done with content
    addAspectTable(doc, chartData, currentY, fontLoaded);
  }
  
  // Add footer with timestamp and page numbers
  addFooter(doc);
  
  return doc;
}

/**
 * Add header with birth data summary
 */
function addHeader(doc: jsPDF, birthData: ExtendedBirthData): number {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  
  // Background color for header
  doc.setFillColor(COLORS.parchment);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Title
  doc.setFontSize(FONTS.title);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.darkGold);
  doc.text('Natal Chart', pageWidth / 2, 20, { align: 'center' });
  
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
  
  if (timezoneText) {
    doc.text(timezoneText, margin, 50);
  }
  
  doc.text(houseSystemText, margin, timezoneText ? 55 : 50);
  
  // Add decorative line
  doc.setDrawColor(COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(margin, 60, pageWidth - margin, 60);
  
  // Return Y position for next content
  return 70;
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
    
    // Remove astrological glyph text elements to avoid PDF generation errors
    // Default PDF fonts don't support astrological symbols, causing 'widths' undefined error
    const glyphElements = svgClone.querySelectorAll('text.glyph');
    console.log(`Found ${glyphElements.length} glyph text elements - removing to avoid PDF errors`);
    glyphElements.forEach((el) => {
      el.remove();
    });
    
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
  y = (doc as any).lastAutoTable.finalY + 10;
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
    `${aspect.angle.toFixed(1)}°`,
    `${aspect.orb.toFixed(1)}°`,
    aspect.applying ? 'Applying' : 'Separating',
  ]);
  
  // Create table
  autoTable(doc, {
    startY: y,
    head: [['Planet 1', 'Planet 2', 'Aspect', 'Angle', 'Orb', 'Applying']],
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
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
    },
  });
  
  // Update Y position after table
  y = (doc as any).lastAutoTable.finalY + 10;
  return y;
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