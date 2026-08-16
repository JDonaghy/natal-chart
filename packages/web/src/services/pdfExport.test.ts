import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateChartPdf } from './pdfExport';
import type { ChartResult, BirthData, Planet } from '@natal-chart/core';

// Track which "page" each recorded draw call landed on, so tests can assert
// that a section heading and its content land together (issue #26).
let currentPage = 1;
interface RecordedCall { method: string; page: number; args: unknown[] }
// Minimal shape of the autoTable() options object this suite inspects.
interface AutoTableOptionsForTest { startY?: number; head?: string[][] }
let callLog: RecordedCall[] = [];
function record(method: string, args: unknown[]): void {
  callLog.push({ method, page: currentPage, args });
}

// Mock jsPDF instance methods
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockText = vi.fn((...args: unknown[]) => record('text', args));
const mockSetLineWidth = vi.fn();
const mockSetDrawColor = vi.fn();
const mockLine = vi.fn();
const mockSetFillColor = vi.fn();
const mockRect = vi.fn((...args: unknown[]) => record('rect', args));
const mockSave = vi.fn();
const mockSetProperties = vi.fn();
const mockGetNumberOfPages = vi.fn(() => currentPage);
const mockSetPage = vi.fn((page: number) => {
  currentPage = page;
});
const mockAddPage = vi.fn(() => {
  currentPage += 1;
});

// Mock jspdf-autotable
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
import autoTable from 'jspdf-autotable';

// Mock jspdf and svg2pdf
vi.mock('jspdf', () => ({
  jsPDF: vi.fn(),
}));
vi.mock('svg2pdf.js', () => ({ svg2pdf: vi.fn() }));
import * as svg2pdfModule from 'svg2pdf.js';
const mockSvg2pdf = vi.mocked(svg2pdfModule.svg2pdf);

// Import mocked jsPDF constructor
import { jsPDF as MockJsPDF } from 'jspdf';

const mockAddFileToVFS = vi.fn();
const mockAddFont = vi.fn();
const mockGetFontList = vi.fn(() => ({}));
const mockExistsFileInVFS = vi.fn(() => false);

// A4 in millimetres — the document is created with `unit: 'mm'`, so every
// geometry computation in pdfExport.ts (margins, cell sizes, page breaks) is
// in mm. A4-in-points (595x842) would make margin/overflow assertions
// meaningless.
const PAGE_SIZE_MM = { width: 210, height: 297 };

const mockJsPDF = vi.fn(() => {
  const instance = {
    setFont: mockSetFont,
    setFontSize: mockSetFontSize,
    setTextColor: mockSetTextColor,
    text: mockText,
    setLineWidth: mockSetLineWidth,
    setDrawColor: mockSetDrawColor,
    line: mockLine,
    setFillColor: mockSetFillColor,
    rect: mockRect,
    save: mockSave,
    setProperties: mockSetProperties,
    getNumberOfPages: mockGetNumberOfPages,
    setPage: mockSetPage,
    addPage: mockAddPage,
    addFileToVFS: mockAddFileToVFS,
    addFont: mockAddFont,
    getFontList: mockGetFontList,
    existsFileInVFS: mockExistsFileInVFS,
    internal: {
      pageSize: { ...PAGE_SIZE_MM },
    },
    lastAutoTable: {
      finalY: 100,
    },
  };
  console.log('mockJsPDF instance', instance);
  return instance;
});

beforeEach(() => {
  vi.clearAllMocks();
  currentPage = 1;
  callLog = [];
  // Setup jsPDF constructor mock
  (MockJsPDF as any).mockImplementation(mockJsPDF);
  // Setup global mocks for svg2pdf plugin
  (global.window as any).jsPDF = MockJsPDF;
  (global.window as any).svg2pdf = mockSvg2pdf;
  // Setup svg2pdf mock to resolve
  mockSvg2pdf.mockImplementation((_element, pdf, _options) => Promise.resolve(pdf));
  // Setup autoTable mock to update lastAutoTable and record which page/startY
  // it was invoked with, so tests can tell which page a table's first row
  // landed on.
  (autoTable as any).mockImplementation((doc: any, options: AutoTableOptionsForTest) => {
    record('autoTable', [options]);
    doc.lastAutoTable = { finalY: (options?.startY ?? 20) + 80 };
  });
  // Reset font mocks
  mockAddFileToVFS.mockClear();
  mockAddFont.mockClear();
  mockGetFontList.mockClear();
  mockExistsFileInVFS.mockClear();
});

describe('generateChartPdf', () => {
  const mockChartData: ChartResult = {
    planets: [
      {
        planet: 'sun',
        longitude: 95.5,
        latitude: 0,
        declination: 0,
        distance: 1,
        speed: 1,
        sign: 'gemini',
        degree: 5,
        minute: 30,
        house: 3,
        retrograde: false,
      },
    ],
    houses: [
      { house: 1, longitude: 95.0, sign: 'gemini', degree: 5, minute: 0 },
      { house: 2, longitude: 125.0, sign: 'leo', degree: 5, minute: 0 },
      { house: 3, longitude: 155.0, sign: 'virgo', degree: 5, minute: 0 },
      { house: 4, longitude: 185.0, sign: 'libra', degree: 5, minute: 0 },
      { house: 5, longitude: 215.0, sign: 'scorpio', degree: 5, minute: 0 },
      { house: 6, longitude: 245.0, sign: 'sagittarius', degree: 5, minute: 0 },
      { house: 7, longitude: 275.0, sign: 'capricorn', degree: 5, minute: 0 },
      { house: 8, longitude: 305.0, sign: 'aquarius', degree: 5, minute: 0 },
      { house: 9, longitude: 335.0, sign: 'pisces', degree: 5, minute: 0 },
      { house: 10, longitude: 5.0, sign: 'aries', degree: 5, minute: 0 },
      { house: 11, longitude: 35.0, sign: 'taurus', degree: 5, minute: 0 },
      { house: 12, longitude: 65.0, sign: 'gemini', degree: 5, minute: 0 },
    ],
    angles: {
      ascendant: 95.0,
      midheaven: 5.0,
      descendant: 275.0,
      imumCoeli: 185.0,
    },
    aspects: [],
    skippedPlanets: [],
  };

  // The full 16-member Planet union (packages/core/src/types.ts) — this is
  // what calculateChart() actually produces in real usage (it always
  // includes both 'fortune' and 'spirit'). Combined with ASC/MC this yields
  // the n=18 aspect grid that lands exactly on the 15mm page margins
  // (cellSize = min(12, 180/18) = 10, gridTotalWidth = 180mm), which is the
  // real-world boundary case, not the n=17 the fixture used to exercise.
  const ALL_PLANETS: Planet[] = [
    'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus',
    'neptune', 'pluto', 'northNode', 'chiron', 'lilith', 'fortune', 'spirit', 'vertex',
  ];

  const fullChartData: ChartResult = {
    planets: ALL_PLANETS.map((planet, i) => ({
      planet,
      longitude: (i * 24) % 360,
      latitude: 0,
      declination: 0,
      distance: 1,
      speed: 1,
      sign: 'aries',
      degree: 5,
      minute: 30,
      house: (i % 12) + 1,
      retrograde: false,
    })),
    houses: mockChartData.houses,
    angles: {
      ascendant: 95.0,
      midheaven: 5.0,
      descendant: 275.0,
      imumCoeli: 185.0,
    },
    aspects: [
      { planet1: 'sun', planet2: 'moon', type: 'conjunction', angle: 0, orb: 2, applying: true, exact: false },
      { planet1: 'sun', planet2: 'mars', type: 'square', angle: 90, orb: 3, applying: false, exact: false },
    ],
    skippedPlanets: [],
  };

  const mockBirthData: BirthData = {
    dateTimeUtc: new Date('1990-06-15T12:00:00Z'),
    latitude: 40.7,
    longitude: -74.0,
    houseSystem: 'P',
  };

  const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mockSvgElement.setAttribute('width', '800');
  mockSvgElement.setAttribute('height', '800');

  it('should generate PDF with valid inputs', async () => {
    // Mock svg2pdf to be present
    mockSvg2pdf.mockImplementation((_element, pdf, _options) => Promise.resolve(pdf));

    const pdf = await generateChartPdf(mockChartData, mockBirthData, mockSvgElement);

    expect(pdf).toBeDefined();
    expect(MockJsPDF).toHaveBeenCalledTimes(1);
    // Expect svg2pdf to be called with SVG element, pdf instance, and options
    expect(mockSvg2pdf).toHaveBeenCalledWith(
      expect.any(SVGElement),
      expect.any(Object), // jsPDF instance
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      })
    );
    // Expect save method exists (but not called because we return the pdf instance)
    expect(mockSave).not.toHaveBeenCalled();
  });

  it.skip('should generate PDF with placeholder when svg2pdf plugin not available', async () => {
    // Remove svg2pdf from window
    (global.window as any).svg2pdf = undefined;

    const pdf = await generateChartPdf(mockChartData, mockBirthData, mockSvgElement);

    expect(pdf).toBeDefined();
    expect(MockJsPDF).toHaveBeenCalledTimes(1);
    // Should not call svg2pdf
    expect(mockSvg2pdf).not.toHaveBeenCalled();
    // Should add placeholder text
    expect(mockText).toHaveBeenCalledWith('Chart wheel SVG export requires svg2pdf plugin.', expect.any(Number), expect.any(Number));
  });

  it('should include birth data header', async () => {
    (global.window as any).svg2pdf = mockSvg2pdf;
    mockSvg2pdf.mockImplementation((_element, pdf, _options) => Promise.resolve(pdf));

    await generateChartPdf(mockChartData, mockBirthData, mockSvgElement);

    // Expect text calls for birth data
    expect(mockText).toHaveBeenCalledWith('Natal Chart', expect.any(Number), expect.any(Number), expect.objectContaining({ align: 'center' }));
    expect(mockText).toHaveBeenCalledWith(expect.stringContaining('Birth:'), expect.any(Number), expect.any(Number));
  });

  it('keeps the "Planet Positions" heading on the same page as its table (issue #26 defect 1)', async () => {
    await generateChartPdf(fullChartData, mockBirthData, mockSvgElement);

    const headingCall = callLog.find(
      (c) => c.method === 'text' && c.args[0] === 'Planet Positions'
    );
    expect(headingCall).toBeDefined();

    const planetTableCall = callLog.find(
      (c) => c.method === 'autoTable' && (c.args[0] as AutoTableOptionsForTest | undefined)?.head?.[0]?.[0] === 'Planet'
    );
    expect(planetTableCall).toBeDefined();

    // The heading and the table it labels must land on the same page — a
    // full-width chart wheel leaves no room underneath it, so this should
    // now be page 2 for a full 15-planet chart, not orphaned on page 1.
    expect(headingCall!.page).toBe(planetTableCall!.page);

    // Sanity: the wheel really did force a page break (this is the scenario
    // that used to orphan the heading on page 1).
    expect(mockAddPage).toHaveBeenCalled();
  });

  it('never draws a section heading on a page with none of its content', async () => {
    await generateChartPdf(fullChartData, mockBirthData, mockSvgElement);

    const headings = ['Chart Wheel', 'Planet Positions', 'Aspects'];
    for (const title of headings) {
      const headingCall = callLog.find((c) => c.method === 'text' && c.args[0] === title);
      expect(headingCall, `expected a "${title}" heading to be drawn`).toBeDefined();
    }

    // "Aspects" heading must share a page with the first cell of its grid.
    const aspectsHeadingCall = callLog.find((c) => c.method === 'text' && c.args[0] === 'Aspects');
    const gridCellSize = Math.min(12, (PAGE_SIZE_MM.width - 2 * 15) / (fullChartData.planets.length + 2));
    const firstGridRect = callLog.find(
      (c) =>
        c.method === 'rect' &&
        c.page >= (aspectsHeadingCall?.page ?? 0) &&
        Math.abs((c.args[2] as number) - gridCellSize) < 0.01 &&
        Math.abs((c.args[3] as number) - gridCellSize) < 0.01
    );
    expect(firstGridRect).toBeDefined();
    expect(firstGridRect!.page).toBe(aspectsHeadingCall!.page);
  });

  it('holds the natal aspect grid inside the 15mm side margins (issue #26 defect 2)', async () => {
    await generateChartPdf(fullChartData, mockBirthData, mockSvgElement);

    const margin = 15;
    const n = fullChartData.planets.length + 2; // + ASC + MC
    const expectedCellSize = Math.min(12, (PAGE_SIZE_MM.width - 2 * margin) / n);

    // Isolate the aspect grid's own cell rects by their known square size —
    // this excludes the full-width header background rect and anything else.
    const gridRects = callLog.filter(
      (c) =>
        c.method === 'rect' &&
        Math.abs((c.args[2] as number) - expectedCellSize) < 0.01 &&
        Math.abs((c.args[3] as number) - expectedCellSize) < 0.01
    );
    expect(gridRects.length).toBeGreaterThan(0);

    const minX = Math.min(...gridRects.map((c) => c.args[0] as number));
    const maxRight = Math.max(...gridRects.map((c) => (c.args[0] as number) + (c.args[2] as number)));

    expect(minX).toBeCloseTo(margin, 1);
    expect(maxRight).toBeCloseTo(PAGE_SIZE_MM.width - margin, 1);
  });
});
