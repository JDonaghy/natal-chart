import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useChart, type TransitLocation } from '../contexts/ChartContext';
import { parseShareParams } from '../utils/shareUrl';
import { convertToUTC } from '../services/timezone';

/**
 * Invisible component that detects share URL params on the /chart or /transits route
 * and auto-triggers chart calculation if share data is present but no
 * chart is loaded yet.
 */
export const ShareLoader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { chartData, loading, calculateChart, setTransitDateStr, setTransitLocation, calculateTransits, setShowAspects, setShowBoundsDecans } = useChart();
  const attempted = useRef(false);
  // Store pending transit info to apply after chartData is available
  const pendingTransit = useRef<{ date: string; location: TransitLocation | null } | null>(null);

  useEffect(() => {
    // Act on /chart or /transits routes with query params
    if ((!location.pathname.startsWith('/chart') && !location.pathname.startsWith('/transits')) || !location.search) return;
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

        // Restore view flags from share URL
        if (shareData.showAspects !== undefined) setShowAspects(shareData.showAspects);
        if (shareData.showBoundsDecans !== undefined) setShowBoundsDecans(shareData.showBoundsDecans);

        // If share URL includes transit date, set up state and navigate to transits
        if (shareData.transitDate) {
          setTransitDateStr(shareData.transitDate);
          const loc = (shareData.transitLat !== undefined && shareData.transitLng !== undefined && shareData.transitTz)
            ? { city: shareData.transitCity || '', latitude: shareData.transitLat, longitude: shareData.transitLng, timezone: shareData.transitTz }
            : null;
          if (loc) setTransitLocation(loc);
          // Queue transit calculation — chartData won't be available until next render
          pendingTransit.current = { date: shareData.transitDate, location: loc };
          navigate('/transits');
        } else {
          navigate('/chart');
        }
      } catch (err) {
        console.error('Failed to load shared chart:', err);
        navigate('/');
      }
    })();
  }, [location, loading, calculateChart, navigate, setTransitDateStr, setTransitLocation]);

  // Effect to calculate transits once chartData becomes available
  useEffect(() => {
    if (pendingTransit.current && chartData) {
      const { date, location: loc } = pendingTransit.current;
      pendingTransit.current = null;
      calculateTransits(new Date(date), loc);
    }
  }, [chartData, calculateTransits]);

  return null;
};
