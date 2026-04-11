import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from 'react';
import type { BirthData as CoreBirthData, ChartResult, TransitResult } from '@natal-chart/core';
import { DEFAULT_GLYPH_SET } from '../utils/astro-glyph-paths';
import { useAuth } from './AuthContext';
import { getCloudPreferences, syncPreferencesDebounced } from '../services/cloudSync';
import {
  type ThemeColors,
  type ThemePreference,
  DEFAULT_THEME_PREFERENCE,
  resolveTheme,
  applyCssVars,
} from '../utils/themes';

export interface ExtendedBirthData extends CoreBirthData {
  city?: string;
  timezone?: string;
  ascHorizontal?: boolean;
}

export interface TransitLocation {
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface ChartContextType {
  chartData: ChartResult | null;
  birthData: ExtendedBirthData | null;
  loading: boolean;
  error: string | null;
  calculateChart: (data: ExtendedBirthData) => Promise<void>;
  loadChart: (chartData: ChartResult, birthData: ExtendedBirthData) => void;
  clearChart: () => void;
  transitData: TransitResult | null;
  transitLoading: boolean;
  transitDateStr: string;
  transitLocation: TransitLocation | null;
  setTransitDateStr: (dateStr: string) => void;
  setTransitLocation: (location: TransitLocation | null) => void;
  calculateTransits: (date: Date, location?: TransitLocation | null) => Promise<void>;
  clearTransits: () => void;
  showAspects: boolean;
  setShowAspects: (show: boolean) => void;
  showBoundsDecans: boolean;
  setShowBoundsDecans: (show: boolean) => void;
  traditionalPlanets: boolean;
  setTraditionalPlanets: (show: boolean) => void;
  glyphSet: string;
  setGlyphSet: (set: string) => void;
  glyphOverrides: Record<string, string>;
  setGlyphOverrides: (overrides: Record<string, string>) => void;
  houseSystem: 'P' | 'W';
  setHouseSystem: (hs: 'P' | 'W') => void;
  ascHorizontal: boolean;
  setAscHorizontal: (asc: boolean) => void;
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
  resolvedTheme: ThemeColors;
}

export const ChartContext = createContext<ChartContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useChart = () => {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a ChartProvider');
  }
  return context;
};

interface ChartProviderProps {
  children: ReactNode;
}

export const ChartProvider: React.FC<ChartProviderProps> = ({ children }) => {
  const [chartData, setChartData] = useState<ChartResult | null>(() => {
    // Try to load from localStorage on initial render
    try {
      const saved = localStorage.getItem('natal-chart-data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [birthData, setBirthData] = useState<ExtendedBirthData | null>(() => {
    try {
      const saved = localStorage.getItem('natal-chart-birth-data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitData, setTransitData] = useState<TransitResult | null>(null);
  const [transitLoading, setTransitLoading] = useState(false);
  const [transitDateStr, setTransitDateStr] = useState('');
  const [transitLocation, setTransitLocation] = useState<TransitLocation | null>(null);
  const [showAspects, setShowAspects] = useState(true);
  const [showBoundsDecans, setShowBoundsDecans] = useState(false);
  const [traditionalPlanets, setTraditionalPlanets] = useState(false);
  const [glyphSet, setGlyphSetState] = useState(() => {
    try {
      return localStorage.getItem('natal-chart-glyph-set') || DEFAULT_GLYPH_SET;
    } catch {
      return DEFAULT_GLYPH_SET;
    }
  });
  const setGlyphSet = useCallback((set: string) => {
    setGlyphSetState(set);
    try {
      localStorage.setItem('natal-chart-glyph-set', set);
    } catch {
      // ignore
    }
  }, []);
  const [glyphOverrides, setGlyphOverridesState] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('natal-chart-glyph-overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const setGlyphOverrides = useCallback((overrides: Record<string, string>) => {
    setGlyphOverridesState(overrides);
    try { localStorage.setItem('natal-chart-glyph-overrides', JSON.stringify(overrides)); } catch { /* ignore */ }
  }, []);
  const [houseSystem, setHouseSystemState] = useState<'P' | 'W'>(() => {
    try {
      const saved = localStorage.getItem('natal-chart-house-system');
      return saved === 'P' ? 'P' : 'W';
    } catch {
      return 'W';
    }
  });
  const setHouseSystem = useCallback((hs: 'P' | 'W') => {
    setHouseSystemState(hs);
    try { localStorage.setItem('natal-chart-house-system', hs); } catch { /* ignore */ }
  }, []);
  const [ascHorizontal, setAscHorizontalState] = useState(() => {
    try {
      const saved = localStorage.getItem('natal-chart-asc-horizontal');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const setAscHorizontal = useCallback((asc: boolean) => {
    setAscHorizontalState(asc);
    try { localStorage.setItem('natal-chart-asc-horizontal', String(asc)); } catch { /* ignore */ }
  }, []);

  // ─── Theme ──────────────────────────────────────────────────────────────
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem('natal-chart-theme');
      return saved ? JSON.parse(saved) : DEFAULT_THEME_PREFERENCE;
    } catch {
      return DEFAULT_THEME_PREFERENCE;
    }
  });
  const setTheme = useCallback((t: ThemePreference) => {
    setThemeState(t);
    try { localStorage.setItem('natal-chart-theme', JSON.stringify(t)); } catch { /* ignore */ }
  }, []);
  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    applyCssVars(resolvedTheme);
  }, [resolvedTheme]);

  // ─── Cloud Preferences Sync ─────────────────────────────────────────────
  const { user } = useAuth();
  const cloudLoadedRef = useRef(false);

  // Load cloud preferences on login (once per session)
  useEffect(() => {
    if (!user || cloudLoadedRef.current) return;
    cloudLoadedRef.current = true;

    getCloudPreferences()
      .then(({ data }) => {
        if (!data) return;
        // Cloud wins — apply to local state
        if (data.houseSystem === 'P' || data.houseSystem === 'W') {
          setHouseSystemState(data.houseSystem);
          try { localStorage.setItem('natal-chart-house-system', data.houseSystem); } catch { /* ignore */ }
        }
        if (typeof data.glyphSet === 'string') {
          setGlyphSetState(data.glyphSet);
          try { localStorage.setItem('natal-chart-glyph-set', data.glyphSet); } catch { /* ignore */ }
        }
        if (data.glyphOverrides && typeof data.glyphOverrides === 'object') {
          setGlyphOverridesState(data.glyphOverrides as Record<string, string>);
          try { localStorage.setItem('natal-chart-glyph-overrides', JSON.stringify(data.glyphOverrides)); } catch { /* ignore */ }
        }
        if (typeof data.ascHorizontal === 'boolean') {
          setAscHorizontalState(data.ascHorizontal);
          try { localStorage.setItem('natal-chart-asc-horizontal', String(data.ascHorizontal)); } catch { /* ignore */ }
        }
        if (data.theme && typeof data.theme === 'object' && 'presetId' in data.theme) {
          const cloudTheme = data.theme as ThemePreference;
          setThemeState(cloudTheme);
          try { localStorage.setItem('natal-chart-theme', JSON.stringify(cloudTheme)); } catch { /* ignore */ }
        }
      })
      .catch(err => console.warn('Failed to load cloud preferences:', err));
  }, [user]);

  // Reset cloud-loaded flag on logout so next login re-fetches
  useEffect(() => {
    if (!user) cloudLoadedRef.current = false;
  }, [user]);

  // Sync preferences to cloud on change (debounced)
  useEffect(() => {
    if (!user) return;
    syncPreferencesDebounced({ houseSystem, glyphSet, glyphOverrides, ascHorizontal, theme });
  }, [user, houseSystem, glyphSet, glyphOverrides, ascHorizontal, theme]);

  const calculate = useCallback(async (data: ExtendedBirthData) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Calculating chart with data:', data);
      
      // Extract core fields for calculation
      const { city: _city, timezone: _timezone, ...coreData } = data;

      // Lazy-load the WASM calculation engine
      const { calculateChart: calc } = await import('@natal-chart/core');
      const result = await calc(coreData);
      
      console.log('Chart calculation result:', result);
      
      setChartData(result);
      setBirthData(data);

      // Save to localStorage
      try {
        localStorage.setItem('natal-chart-data', JSON.stringify(result));
      } catch (e) {
        console.warn('Failed to save chart to localStorage:', e);
      }

      // Also save extended birth data for future reference (including city/timezone)
      try {
        localStorage.setItem('natal-chart-birth-data', JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to save birth data to localStorage:', e);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate chart';
      setError(message);
      console.error('Chart calculation error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChartData = useCallback((newChartData: ChartResult, newBirthData: ExtendedBirthData) => {
    setChartData(newChartData);
    setBirthData(newBirthData);
    setError(null);
    try {
      localStorage.setItem('natal-chart-data', JSON.stringify(newChartData));
      localStorage.setItem('natal-chart-birth-data', JSON.stringify(newBirthData));
    } catch (e) {
      console.warn('Failed to save loaded chart to localStorage:', e);
    }
  }, []);

  const clearChart = useCallback(() => {
    setChartData(null);
    setBirthData(null);
    setError(null);
    localStorage.removeItem('natal-chart-data');
    localStorage.removeItem('natal-chart-birth-data');
  }, []);

  const calculateTransits = useCallback(async (date: Date, location?: TransitLocation | null) => {
    if (!chartData) return;
    setTransitLoading(true);
    try {
      const { calculateTransitPositions } = await import('@natal-chart/core');
      const loc = location !== undefined ? location : transitLocation;
      // Default to birth location if no transit city specified
      const locationInput = loc ? {
        latitude: loc.latitude,
        longitude: loc.longitude,
        houseSystem: birthData?.houseSystem || 'P' as const,
      } : birthData ? {
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        houseSystem: birthData.houseSystem,
      } : undefined;
      const result = await calculateTransitPositions(date, chartData.planets, locationInput);
      setTransitData(result);
    } catch (err) {
      console.error('Transit calculation error:', err);
      setTransitData(null);
    } finally {
      setTransitLoading(false);
    }
  }, [chartData, transitLocation, birthData]);

  const clearTransits = useCallback(() => {
    setTransitData(null);
  }, []);

  const value: ChartContextType = {
    chartData,
    birthData,
    loading,
    error,
    calculateChart: calculate,
    loadChart: loadChartData,
    clearChart,
    transitData,
    transitLoading,
    transitDateStr,
    transitLocation,
    setTransitDateStr,
    setTransitLocation,
    calculateTransits,
    clearTransits,
    showAspects,
    setShowAspects,
    showBoundsDecans,
    setShowBoundsDecans,
    traditionalPlanets,
    setTraditionalPlanets,
    glyphSet,
    setGlyphSet,
    glyphOverrides,
    setGlyphOverrides,
    houseSystem,
    setHouseSystem,
    ascHorizontal,
    setAscHorizontal,
    theme,
    setTheme,
    resolvedTheme,
  };

  return (
    <ChartContext.Provider value={value}>
      {children}
    </ChartContext.Provider>
  );
};