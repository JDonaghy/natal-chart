import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateChartPdf } from './pdfExport';
import type { ChartResult, BirthData } from '@natal-chart/core';

// Mock jsPDF instance methods
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockText = vi.fn();
const mockSetLineWidth = vi.fn();
const mockSetDrawColor = vi.fn();
const mockLine = vi.fn();
const mockSetFillColor = vi.fn();
const mockRect = vi.fn();
const mockSave = vi.fn();
const mockSetProperties = vi.fn();
const mockGetNumberOfPages = vi.fn(() => 1);
const mockSetPage = vi.fn();

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
    addFileToVFS: mockAddFileToVFS,
    addFont: mockAddFont,
    getFontList: mockGetFontList,
    existsFileInVFS: mockExistsFileInVFS,
    internal: {
      pageSize: { width: 595, height: 842 },
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
  // Setup jsPDF constructor mock
  (MockJsPDF as any).mockImplementation(mockJsPDF);
  // Setup global mocks for svg2pdf plugin
  (global.window as any).jsPDF = MockJsPDF;
  (global.window as any).svg2pdf = mockSvg2pdf;
  // Setup svg2pdf mock to resolve
  mockSvg2pdf.mockImplementation((_element, pdf, _options) => Promise.resolve(pdf));
  // Setup autoTable mock to update lastAutoTable
  (autoTable as any).mockImplementation((doc: any) => {
    doc.lastAutoTable = { finalY: 100 };
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
});