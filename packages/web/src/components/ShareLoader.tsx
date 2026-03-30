import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useChart } from '../contexts/ChartContext';
import { parseShareParams } from '../utils/shareUrl';
import { convertToUTC } from '../services/timezone';

/**
 * Invisible component that detects share URL params on the /chart route
 * and auto-triggers chart calculation if share data is present but no
 * chart is loaded yet.
 */
export const ShareLoader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, calculateChart } = useChart();
  const attempted = useRef(false);

  useEffect(() => {
    // Only act on /chart route with query params
    if (!location.pathname.startsWith('/chart') || !location.search) return;
    // Don't re-attempt if we already tried or are loading
    if (attempted.current || loading) return;

    const shareData = parseShareParams();
    if (!shareData) return;

    attempted.current = true;

    (async () => {
      try {
        const utcDate = convertToUTC(
          shareData.birthDate,
          shareData.birthTime,
          shareData.timezone,
        );

        const extData: Parameters<typeof calculateChart>[0] = {
          dateTimeUtc: utcDate,
          latitude: shareData.latitude,
          longitude: shareData.longitude,
          houseSystem: shareData.houseSystem,
          timezone: shareData.timezone,
        };
        if (shareData.city) {
          extData.city = shareData.city;
        }
        await calculateChart(extData);
      } catch (err) {
        console.error('Failed to load shared chart:', err);
        navigate('/');
      }
    })();
  }, [location, loading, calculateChart, navigate]);

  return null;
};
