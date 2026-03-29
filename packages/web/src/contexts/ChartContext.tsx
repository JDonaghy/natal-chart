import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BirthData as CoreBirthData, ChartResult, calculateChart } from '@natal-chart/core';

export interface ExtendedBirthData extends CoreBirthData {
  city?: string;
  timezone?: string;
}

interface ChartContextType {
  chartData: ChartResult | null;
  loading: boolean;
  error: string | null;
  calculateChart: (data: ExtendedBirthData) => Promise<void>;
  clearChart: () => void;
}

const ChartContext = createContext<ChartContextType | undefined>(undefined);

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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (data: ExtendedBirthData) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Calculating chart with data:', data);
      
      // Extract core fields for calculation
      const { city: _city, timezone: _timezone, ...coreData } = data;
      
      // Call the core calculation engine
      const result = await calculateChart(coreData);
      
      console.log('Chart calculation result:', result);
      
      setChartData(result);
      
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

  const clearChart = useCallback(() => {
    setChartData(null);
    setError(null);
    localStorage.removeItem('natal-chart-data');
    localStorage.removeItem('natal-chart-birth-data');
  }, []);

  const value: ChartContextType = {
    chartData,
    loading,
    error,
    calculateChart: calculate,
    clearChart,
  };

  return (
    <ChartContext.Provider value={value}>
      {children}
    </ChartContext.Provider>
  );
};