
import { useState, useEffect } from 'react';
import { SensorData } from '../types';

export const useSensorData = (isMonitoring: boolean): SensorData => {
  const [sensorData, setSensorData] = useState<SensorData>({
    ax: 0,
    ay: 0,
    az: 0,
    alpha: 0,
    beta: 0,
    gamma: 0,
  });

  useEffect(() => {
    if (!isMonitoring) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      setSensorData(prev => ({
        ...prev,
        ax: event.acceleration?.x ?? prev.ax,
        ay: event.acceleration?.y ?? prev.ay,
        az: event.acceleration?.z ?? prev.az,
      }));
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setSensorData(prev => ({
        ...prev,
        alpha: event.alpha ?? prev.alpha,
        beta: event.beta ?? prev.beta,
        gamma: event.gamma ?? prev.gamma,
      }));
    };
    
    // Permissions are expected to be granted before this hook is used.
    // We simply add the listeners. If permissions are not granted,
    // these events will likely not fire, but it won't crash the app.
    // The onboarding flow in PermissionsPage should prevent users from
    // reaching the monitoring stage without these permissions.
    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);


    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isMonitoring]);

  return sensorData;
};
