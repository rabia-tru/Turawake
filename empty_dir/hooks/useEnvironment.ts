import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EnvironmentContext } from '../types';
import { getRoadType, getWeather, getTimeOfDay } from '../services/environmentService';

const CONTEXT_UPDATE_INTERVAL = 15000; // Update context every 15 seconds

// Custom hook for throttling callbacks to prevent excessive API calls
export const useThrottledCallback = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
  deps: React.DependencyList
) => {
  const timeoutRef = useRef<number | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCallTimeRef.current >= delay) {
      lastCallTimeRef.current = now;
      callbackRef.current(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        lastCallTimeRef.current = Date.now();
        callbackRef.current(...args);
      }, delay - (now - lastCallTimeRef.current));
    }
  }, [delay, ...deps]);
};


export const useEnvironment = (isMonitoring: boolean): EnvironmentContext | null => {
  const [environment, setEnvironment] = useState<EnvironmentContext | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const updateEnvironmentContext = useThrottledCallback(
    async (position: GeolocationPosition) => {
      const { latitude, longitude, speed } = position.coords;
      const speedKmh = speed ? speed * 3.6 : null;

      try {
        const [roadType, weather] = await Promise.all([
          getRoadType(latitude, longitude),
          getWeather(latitude, longitude),
        ]);
        const timeOfDay = getTimeOfDay();

        setEnvironment({
          roadType,
          timeOfDay,
          weather: weather,
          speed: speedKmh
        });
      } catch (error) {
        console.error("Failed to update environment context:", error);
      }
    },
    CONTEXT_UPDATE_INTERVAL,
    []
  );

  useEffect(() => {
    if (isMonitoring) {
      const geoOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      const onSuccess = (position: GeolocationPosition) => {
        updateEnvironmentContext(position);
      };

      const onError = (error: GeolocationPositionError) => {
        console.warn(`Geolocation Error (${error.code}): ${error.message}`);
        // Fallback to a default context if location fails
        if (!environment) {
            setEnvironment({
                roadType: 'unknown',
                timeOfDay: getTimeOfDay(),
                weather: null,
                speed: null
            });
        }
      };

      watchIdRef.current = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        geoOptions
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isMonitoring, updateEnvironmentContext, environment]);

  return environment;
};