import type { ChartResult } from '@natal-chart/core';
import { ExtendedBirthData, TransitLocation } from '../contexts/ChartContext';

export interface SavedChart {
  id: string;
  name: string;
  chartData: ChartResult;
  birthData: ExtendedBirthData;
  savedAt: string;
  transitDateStr?: string;
  transitLocation?: TransitLocation;
}

const STORAGE_KEY = 'natal-chart-saved-charts';

export function getSavedCharts(): SavedChart[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveChart(
  name: string,
  chartData: ChartResult,
  birthData: ExtendedBirthData,
  transitDateStr?: string | undefined,
  transitLoc?: TransitLocation | undefined,
): SavedChart {
  const charts = getSavedCharts();
  const entry: SavedChart = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    chartData,
    birthData,
    savedAt: new Date().toISOString(),
  };
  if (transitDateStr) {
    entry.transitDateStr = transitDateStr;
  }
  if (transitLoc) {
    entry.transitLocation = transitLoc;
  }
  charts.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
  return entry;
}

export function deleteSavedChart(id: string): void {
  const charts = getSavedCharts().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
}
