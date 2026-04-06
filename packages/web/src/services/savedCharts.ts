import type { ChartResult } from '@natal-chart/core';
import { ExtendedBirthData, TransitLocation } from '../contexts/ChartContext';
import {
  listCloudCharts,
  getCloudChart,
  createCloudChart,
  updateCloudChart,
  deleteCloudChart as deleteCloudChartApi,
  createShareToken as createShareTokenApi,
  revokeShareToken as revokeShareTokenApi,
  type CloudChartSummary,
  type CloudChartData,
} from './cloudSync';
import { getIdToken } from './auth';

export interface SavedChart {
  id: string;
  name: string;
  chartData: ChartResult;
  birthData: ExtendedBirthData;
  savedAt: string;
  transitDateStr?: string;
  transitLocation?: TransitLocation;
  showAspects?: boolean;
  showBoundsDecans?: boolean;
  traditionalPlanets?: boolean;
  glyphSet?: string;
}

/** Summary for chart list UI (works for both local and cloud) */
export interface SavedChartSummary {
  id: string;
  name: string;
  savedAt: string;
  source: 'local' | 'cloud';
  shareToken?: string | null | undefined;
  city?: string | undefined;
  isTransit?: boolean | undefined;
}

const STORAGE_KEY = 'natal-chart-saved-charts';

// ─── Local Storage (existing, synchronous) ──────────────────────────────────

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
  viewFlags?: { showAspects?: boolean; showBoundsDecans?: boolean; traditionalPlanets?: boolean; glyphSet?: string },
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
  if (viewFlags?.showAspects === false) {
    entry.showAspects = false;
  }
  if (viewFlags?.showBoundsDecans === true) {
    entry.showBoundsDecans = true;
  }
  if (viewFlags?.traditionalPlanets === true) {
    entry.traditionalPlanets = true;
  }
  if (viewFlags?.glyphSet && viewFlags.glyphSet !== 'classic') {
    entry.glyphSet = viewFlags.glyphSet;
  }
  charts.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));

  // Also save to cloud if logged in (fire and forget)
  saveChartToCloud(name, birthData, transitDateStr, transitLoc, viewFlags)
    .catch(err => console.warn('Failed to save chart to cloud:', err));

  return entry;
}

export function deleteSavedChart(id: string): void {
  const charts = getSavedCharts().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
}

export function renameSavedChart(id: string, newName: string): void {
  const charts = getSavedCharts();
  const chart = charts.find(c => c.id === id);
  if (chart) {
    chart.name = newName;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
  }
}

// ─── Cloud-Aware Functions ──────────────────────────────────────────────────

async function isLoggedIn(): Promise<boolean> {
  const token = await getIdToken();
  return Boolean(token);
}

/** Save chart inputs to cloud D1 */
async function saveChartToCloud(
  name: string,
  birthData: ExtendedBirthData,
  transitDateStr?: string,
  transitLoc?: TransitLocation,
  viewFlags?: { showAspects?: boolean; showBoundsDecans?: boolean; traditionalPlanets?: boolean; glyphSet?: string },
): Promise<void> {
  if (!(await isLoggedIn())) return;

  const chartInput: Parameters<typeof createCloudChart>[0] = {
    name,
    birthData: {
      dateTimeUtc: birthData.dateTimeUtc instanceof Date
        ? birthData.dateTimeUtc.toISOString()
        : String(birthData.dateTimeUtc),
      latitude: birthData.latitude,
      longitude: birthData.longitude,
      houseSystem: birthData.houseSystem,
      city: birthData.city,
      timezone: birthData.timezone,
      ascHorizontal: birthData.ascHorizontal,
    },
  };
  if (viewFlags) {
    chartInput.viewFlags = {
      showAspects: viewFlags.showAspects,
      showBoundsDecans: viewFlags.showBoundsDecans,
      traditionalPlanets: viewFlags.traditionalPlanets,
      glyphSet: viewFlags.glyphSet,
    };
  }
  if (transitDateStr) {
    chartInput.transitData = {
      transitDateStr,
      transitLocation: transitLoc ?? null,
    };
  }
  await createCloudChart(chartInput);
}

/** List charts from cloud. Returns summaries (no full chart data). */
export async function listCloudSavedCharts(): Promise<SavedChartSummary[]> {
  if (!(await isLoggedIn())) return [];

  const charts = await listCloudCharts();
  return charts.map((c: CloudChartSummary) => ({
    id: c.id,
    name: c.name,
    savedAt: c.created_at,
    source: 'cloud' as const,
    shareToken: c.share_token,
  }));
}

/** Load a single cloud chart by ID. Returns the full data needed to recalculate. */
export async function loadCloudChart(id: string): Promise<CloudChartData> {
  return getCloudChart(id);
}

/** Delete a cloud chart by ID. */
export async function deleteCloudSavedChart(id: string): Promise<void> {
  await deleteCloudChartApi(id);
}

/** Get combined list from both local and cloud. */
export async function getAllSavedChartSummaries(): Promise<SavedChartSummary[]> {
  const local: SavedChartSummary[] = getSavedCharts().map(c => ({
    id: c.id,
    name: c.name,
    savedAt: c.savedAt,
    source: 'local' as const,
    city: c.birthData?.city,
    isTransit: Boolean(c.transitDateStr),
  }));

  try {
    const cloud = await listCloudSavedCharts();
    return [...cloud, ...local];
  } catch {
    return local;
  }
}

/** Rename a chart (local + cloud). */
export async function renameChart(id: string, newName: string, source: 'local' | 'cloud'): Promise<void> {
  if (source === 'local') {
    renameSavedChart(id, newName);
    // No cloud equivalent for local-only charts
  } else {
    await updateCloudChart(id, { name: newName });
  }
}

/** Delete a chart (local + cloud). */
export async function deleteChart(id: string, source: 'local' | 'cloud'): Promise<void> {
  if (source === 'local') {
    deleteSavedChart(id);
  } else {
    await deleteCloudSavedChart(id);
  }
}

/** Generate a share link for a cloud chart. */
export async function shareChart(chartId: string): Promise<string> {
  return createShareTokenApi(chartId);
}

/** Revoke a share link for a cloud chart. */
export async function unshareChart(chartId: string): Promise<void> {
  await revokeShareTokenApi(chartId);
}
