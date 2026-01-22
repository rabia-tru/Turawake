import { useState, useEffect, useRef } from 'react';
import { SensorData, DrivingManeuverEvent, DrivingManeuverType } from '../types';

// These thresholds are based on common standards for telematics.
// They represent a significant change in m/s^2 over a short period.
const HARSH_BRAKING_THRESHOLD = 4.0; // Corresponds to braking hard
const SUDDEN_ACCELERATION_THRESHOLD = -4.0; // Corresponds to flooring the gas pedal
const SHARP_TURN_THRESHOLD = 4.5; // Corresponds to a very sharp, fast turn

// Cooldown period in milliseconds to prevent duplicate events for a single maneuver.
const MANEUVER_COOLDOWN = 2000;

/**
 * A custom hook that analyzes sensor data to detect harsh driving maneuvers.
 * Assumes the phone is in landscape mode, mounted on the dashboard.
 * - Y-axis (ay): Forward (negative) and backward (positive) acceleration.
 * - X-axis (ax): Lateral (left/right) acceleration.
 *
 * @param sensorData The live sensor data feed.
 * @param isMonitoring Whether the monitoring session is active.
 * @returns An array of detected driving maneuver events.
 */
export const useDrivingAnalysis = (sensorData: SensorData, isMonitoring: boolean): DrivingManeuverEvent[] => {
  const [maneuvers, setManeuvers] = useState<DrivingManeuverEvent[]>([]);
  const lastEventTimeRef = useRef<{ [key in DrivingManeuverType]?: number }>({});
  const prevSensorDataRef = useRef<SensorData>(sensorData);

  useEffect(() => {
    if (!isMonitoring) {
      // Reset on new session
      setManeuvers([]);
      lastEventTimeRef.current = {};
      return;
    }

    const now = Date.now();

    // Calculate delta to detect sudden changes
    const deltaAy = sensorData.ay - prevSensorDataRef.current.ay;
    const deltaAx = sensorData.ax - prevSensorDataRef.current.ax;

    const checkAndAddManeuver = (type: DrivingManeuverType) => {
      if (now - (lastEventTimeRef.current[type] ?? 0) > MANEUVER_COOLDOWN) {
        setManeuvers(prev => [...prev, { timestamp: now, type }]);
        lastEventTimeRef.current[type] = now;
      }
    };

    // Check for Harsh Braking (sudden increase in positive ay)
    if (deltaAy > HARSH_BRAKING_THRESHOLD) {
      checkAndAddManeuver('Harsh Braking');
    }

    // Check for Sudden Acceleration (sudden increase in negative ay)
    if (deltaAy < SUDDEN_ACCELERATION_THRESHOLD) {
      checkAndAddManeuver('Sudden Acceleration');
    }

    // Check for Sharp Turn (sudden lateral movement on ax)
    if (Math.abs(deltaAx) > SHARP_TURN_THRESHOLD) {
      checkAndAddManeuver('Sharp Turn');
    }
    
    prevSensorDataRef.current = sensorData;

  }, [sensorData, isMonitoring]);

  return maneuvers;
};
