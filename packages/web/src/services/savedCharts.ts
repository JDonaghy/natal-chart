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
  cloudId?: string;  // UUID from D1 if synced to cloud
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
  cloudId?: string | undefined;  // Cloud UUID (for synced or cloud-only charts)
  name: string;
  savedAt: string;
  source: 'local' | 'cloud' | 'synced';
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

  // Also save to cloud if logged in (fire and forget, then store cloudId)
  saveChartToCloud(name, birthData, transitDateStr, transitLoc, viewFlags)
    .then(cloudId => {
      if (cloudId) {
        setCloudId(entry.id, cloudId);
      }
    })
    .catch(err => console.warn('Failed to save chart to cloud:', err));

  return entry;
}

export function deleteSavedChart(id: string): void {
  const charts = getSavedCharts().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
}

/** Save a chart to localStorage only, with a pre-existing cloudId (no cloud upload). */
export function saveLocalFromCloud(
  cloudId: string,
  name: string,
  chartData: ChartResult,
  birthData: ExtendedBirthData,
  transitDateStr?: string,
  transitLoc?: TransitLocation,
  viewFlags?: { showAspects?: boolean; showBoundsDecans?: boolean; traditionalPlanets?: boolean; glyphSet?: string },
): void {
  const charts = getSavedCharts();
  // Don't duplicate if already linked
  if (charts.some(c => c.cloudId === cloudId)) return;

  const entry: SavedChart = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    cloudId,
    name,
    chartData,
    birthData,
    savedAt: new Date().toISOString(),
  };
  if (transitDateStr) entry.transitDateStr = transitDateStr;
  if (transitLoc) entry.transitLocation = transitLoc;
  if (viewFlags?.showAspects === false) entry.showAspects = false;
  if (viewFlags?.showBoundsDecans === true) entry.showBoundsDecans = true;
  if (viewFlags?.traditionalPlanets === true) entry.traditionalPlanets = true;
  if (viewFlags?.glyphSet && viewFlags.glyphSet !== 'classic') entry.glyphSet = viewFlags.glyphSet;
  charts.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
}

/** Set the cloudId on a local chart after successful cloud upload. */
export function setCloudId(localId: string, cloudId: string): void {
  const charts = getSavedCharts();
  const chart = charts.find(c => c.id === localId);
  if (chart) {
    chart.cloudId = cloudId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
  }
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

/** Save chart inputs to cloud D1. Returns cloud UUID on success, null otherwise. */
async function saveChartToCloud(
  name: string,
  birthData: ExtendedBirthData,
  transitDateStr?: string,
  transitLoc?: TransitLocation,
  viewFlags?: { showAspects?: boolean; showBoundsDecans?: boolean; traditionalPlanets?: boolean; glyphSet?: string },
): Promise<string | null> {
  if (!(await isLoggedIn())) return null;

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
  const result = await createCloudChart(chartInput);
  return result.id;
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

/** Get combined list from both local and cloud, deduplicated. */
export async function getAllSavedChartSummaries(): Promise<SavedChartSummary[]> {
  const localCharts = getSavedCharts();
  const localSummaries: SavedChartSummary[] = localCharts.map(c => ({
    id: c.id,
    cloudId: c.cloudId,
    name: c.name,
    savedAt: c.savedAt,
    source: c.cloudId ? 'synced' as const : 'local' as const,
    city: c.birthData?.city,
    isTransit: Boolean(c.transitDateStr),
  }));

  try {
    const cloud = await listCloudSavedCharts();

    // Build lookup of cloud charts by ID for merging
    const cloudById = new Map(cloud.map(c => [c.id, c]));

    // For synced charts, merge cloud name and shareToken (handles remote renames)
    for (const summary of localSummaries) {
      if (summary.cloudId) {
        const cloudVersion = cloudById.get(summary.cloudId);
        if (cloudVersion) {
          if (cloudVersion.name !== summary.name) {
            summary.name = cloudVersion.name;
            // Persist the updated name to localStorage so it stays in sync
            renameSavedChart(summary.id, cloudVersion.name);
          }
          summary.shareToken = cloudVersion.shareToken;
          cloudById.delete(summary.cloudId);
        }
      }
    }

    // Remaining cloud charts are cloud-only (not linked to any local chart)
    const cloudOnly: SavedChartSummary[] = [...cloudById.values()];

    return [...localSummaries, ...cloudOnly];
  } catch {
    return localSummaries;
  }
}

/** Rename a chart (handles all source states). */
export async function renameChart(id: string, newName: string, source: 'local' | 'cloud' | 'synced', cloudId?: string): Promise<void> {
  if (source === 'cloud') {
    await updateCloudChart(id, { name: newName });
  } else {
    // Local or synced — update localStorage
    renameSavedChart(id, newName);
    // If synced, also update cloud
    if (source === 'synced' && cloudId) {
      await updateCloudChart(cloudId, { name: newName }).catch(err =>
        console.warn('Failed to rename in cloud:', err),
      );
    }
  }
}

/** Delete a chart (handles all source states). */
export async function deleteChart(id: string, source: 'local' | 'cloud' | 'synced', cloudId?: string): Promise<void> {
  if (source === 'cloud') {
    await deleteCloudSavedChart(id);
  } else {
    // Local or synced — remove from localStorage
    deleteSavedChart(id);
    // If synced, also delete from cloud
    if (source === 'synced' && cloudId) {
      await deleteCloudSavedChart(cloudId).catch(err =>
        console.warn('Failed to delete from cloud:', err),
      );
    }
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
