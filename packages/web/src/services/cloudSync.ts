/**
 * Cloud sync service — API client for the Cloudflare Worker.
 * All methods require an auth token (Firebase ID token).
 */

import { getIdToken } from './auth';

// Worker API base URL — use proxy in dev, direct URL in production
const API_BASE = import.meta.env.VITE_WORKER_API_URL || '/api';

async function authFetch(path: string, options: globalThis.RequestInit = {}): Promise<Response> {
  const token = await getIdToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
    throw new Error(body.error || `API error: ${response.status}`);
  }

  return response;
}

// ─── User ───────────────────────────────────────────────────────────────────

export async function upsertUser(): Promise<void> {
  await authFetch('/user', { method: 'POST' });
}

export async function deleteAccount(): Promise<void> {
  await authFetch('/user', { method: 'DELETE' });
}

// ─── Preferences ────────────────────────────────────────────────────────────

export interface CloudPreferences {
  houseSystem?: string;
  glyphSet?: string;
  ascHorizontal?: boolean;
  [key: string]: unknown;
}

export async function getCloudPreferences(): Promise<{ data: CloudPreferences | null; updatedAt?: string }> {
  const response = await authFetch('/preferences');
  return response.json();
}

export async function putCloudPreferences(data: CloudPreferences): Promise<void> {
  await authFetch('/preferences', {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

// Debounced preference sync — saves at most once per 2 seconds
let prefSyncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPrefs: CloudPreferences | null = null;

export function syncPreferencesDebounced(data: CloudPreferences): void {
  pendingPrefs = data;
  if (prefSyncTimer) clearTimeout(prefSyncTimer);
  prefSyncTimer = setTimeout(async () => {
    if (pendingPrefs) {
      try {
        await putCloudPreferences(pendingPrefs);
        pendingPrefs = null;
      } catch (err) {
        console.warn('Failed to sync preferences to cloud:', err);
      }
    }
  }, 2000);
}

// ─── Charts ─────────────────────────────────────────────────────────────────

export interface CloudChartSummary {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  share_token: string | null;
}

export interface CloudChartData {
  id: string;
  name: string;
  birthData: Record<string, unknown>;
  viewFlags: Record<string, unknown> | null;
  transitData: Record<string, unknown> | null;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listCloudCharts(): Promise<CloudChartSummary[]> {
  const response = await authFetch('/charts');
  const body = await response.json() as { charts: CloudChartSummary[] };
  return body.charts;
}

export async function getCloudChart(id: string): Promise<CloudChartData> {
  const response = await authFetch(`/charts/${id}`);
  return response.json();
}

export async function createCloudChart(chart: {
  name: string;
  birthData: Record<string, unknown>;
  viewFlags?: Record<string, unknown> | undefined;
  transitData?: Record<string, unknown> | undefined;
}): Promise<{ id: string; name: string }> {
  const response = await authFetch('/charts', {
    method: 'POST',
    body: JSON.stringify(chart),
  });
  return response.json();
}

export async function updateCloudChart(
  id: string,
  updates: {
    name?: string;
    birthData?: Record<string, unknown>;
    viewFlags?: Record<string, unknown>;
    transitData?: Record<string, unknown>;
  },
): Promise<void> {
  await authFetch(`/charts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteCloudChart(id: string): Promise<void> {
  await authFetch(`/charts/${id}`, { method: 'DELETE' });
}

// ─── Sharing ────────────────────────────────────────────────────────────────

export async function createShareToken(chartId: string): Promise<string> {
  const response = await authFetch(`/charts/${chartId}/share`, { method: 'POST' });
  const body = await response.json() as { shareToken: string };
  return body.shareToken;
}

export async function revokeShareToken(chartId: string): Promise<void> {
  await authFetch(`/charts/${chartId}/share`, { method: 'DELETE' });
}
