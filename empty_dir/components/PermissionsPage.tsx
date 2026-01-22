// components/PermissionsPage.tsx
import React, { useState, useEffect } from 'react';
import { BellIcon, CameraIcon, CheckCircleIcon, LocationMarkerIcon, SensorIcon, XCircleIcon } from './icons';
import { Spinner } from './Spinner';
import { requestNotifications, sendNotification } from '../services/notificationsWrapper';
import { Geolocation } from '@capacitor/geolocation';

interface PermissionsPageProps {
  onComplete: () => void;
}

type PermissionStatus = 'prompt' | 'granted' | 'denied';

const PermissionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  status: PermissionStatus;
  onRequest: () => void;
  isCritical?: boolean;
}> = ({ icon, title, description, status, onRequest, isCritical = false }) => {
  const getStatusIndicator = () => {
    switch (status) {
      case 'granted':
        return (
          <div className="flex items-center space-x-1 text-sm text-green-400">
            <CheckCircleIcon className="w-4 h-4" />
            <span>Enabled</span>
          </div>
        );
      case 'denied':
        return (
          <div className="flex items-center space-x-1 text-sm text-red-400">
            <XCircleIcon className="w-4 h-4" />
            <span>Denied</span>
          </div>
        );
      default:
        return <span className="text-sm text-slate-400">{isCritical ? 'Required' : 'Recommended'}</span>;
    }
  };

  return (
    <div className="bg-slate-800/60 p-4 rounded-xl flex items-center space-x-4 border border-slate-700">
      <div className="flex-shrink-0 p-3 bg-slate-700/50 rounded-full">{icon}</div>
      <div className="flex-grow">
        <h3 className="font-bold text-slate-100">{title}</h3>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <div className="flex flex-col items-center space-y-1">
        {status === 'prompt' ? (
          <button
            onClick={onRequest}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1.5 px-4 rounded-md transition"
          >
            Enable
          </button>
        ) : (
          <div className="w-16 h-7" /> // keeps alignment
        )}
        {getStatusIndicator()}
      </div>
    </div>
  );
};

const PermissionsPage: React.FC<PermissionsPageProps> = ({ onComplete }) => {
  const [notificationStatus, setNotificationStatus] = useState<PermissionStatus>('prompt');
  const [locationStatus, setLocationStatus] = useState<PermissionStatus>('prompt');
  const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('prompt');
  const [motionStatus, setMotionStatus] = useState<PermissionStatus>('prompt');
  const [isChecking, setIsChecking] = useState(true);
  const [isSecureContext, setIsSecureContext] = useState(false);

  useEffect(() => {
    setIsSecureContext(window.isSecureContext);

    const checkInitialPermissions = async () => {
      try {
        // Notifications
        // We assume 'prompt' until user grants/denies
        setNotificationStatus('prompt');

        // Location (Capacitor)
        const geoPerm = await Geolocation.checkPermissions();
        setLocationStatus(geoPerm.location === 'granted' ? 'granted' : 'prompt');

        // Camera and Motion defaults to 'prompt'
        setCameraStatus('prompt');
        setMotionStatus('prompt');
      } catch (err) {
        console.warn('Permission check failed:', err);
      } finally {
        setIsChecking(false);
      }
    };

    checkInitialPermissions();
  }, []);

  const requestNotificationsHandler = async () => {
    try {
      const result = await requestNotifications();
      setNotificationStatus(result);

      if (result === 'granted') {
        await sendNotification('Notifications Enabled', 'TruAwake notifications are now active ✅');
      }
    } catch (err) {
      console.error('Notification error:', err);
      setNotificationStatus('denied');
    }
  };

  const requestLocation = async () => {
    try {
      await Geolocation.requestPermissions();
      await Geolocation.getCurrentPosition();
      setLocationStatus('granted');
    } catch (err) {
      console.error('Location error:', err);
      setLocationStatus('denied');
    }
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraStatus('granted');
    } catch (err) {
      setCameraStatus('denied');
    }
  };

  const requestMotion = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const motionState = await (DeviceMotionEvent as any).requestPermission();
        if (motionState === 'granted') {
          await (DeviceOrientationEvent as any).requestPermission();
          setMotionStatus('granted');
        } else {
          setMotionStatus('denied');
        }
      } catch {
        setMotionStatus('denied');
      }
    } else {
      setMotionStatus('granted'); // fallback
    }
  };

  const isContinueEnabled =
    cameraStatus === 'granted' &&
    locationStatus === 'granted' &&
    motionStatus === 'granted' &&
    notificationStatus === 'granted';

  return (
    <div className="flex flex-col h-full p-4 bg-pro-gradient overflow-y-auto">
      <header className="mb-6 relative text-center">
        <h1 className="text-2xl font-bold text-slate-100">Final Step: Enable Features</h1>
      </header>

      <div className="w-full max-w-md mx-auto">
        <div className="bg-slate-900/70 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-slate-700/50">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-100">App Permissions</h2>
            <p className="text-blue-300 mt-1">
              To keep you safe, TruAwake needs access to some of your phone's features.
            </p>
          </div>

          {!isSecureContext && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm rounded-lg p-3 mb-6 text-center">
              <p>
                <span className="font-bold">Security Warning:</span> Permissions can only be enabled on a secure
                (https://) connection. Your current connection is insecure.
              </p>
            </div>
          )}

          {isChecking ? (
            <div className="flex justify-center p-8">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="space-y-4">
              <PermissionCard
                icon={<CameraIcon className="w-6 h-6 text-red-400" />}
                title="Camera Access"
                description="Required for AI to monitor for signs of drowsiness."
                status={cameraStatus}
                onRequest={requestCamera}
                isCritical
              />
              <PermissionCard
                icon={<LocationMarkerIcon className="w-6 h-6 text-green-400" />}
                title="Location Access"
                description="Used for maps, routing, and environment-aware alerts."
                status={locationStatus}
                onRequest={requestLocation}
                isCritical
              />
              <PermissionCard
                icon={<SensorIcon className="w-6 h-6 text-purple-400" />}
                title="Motion Sensors"
                description="Required to detect harsh braking and other driving events."
                status={motionStatus}
                onRequest={requestMotion}
                isCritical
              />
              <PermissionCard
                icon={<BellIcon className="w-6 h-6 text-yellow-400" />}
                title="Notifications & Alarms"
                description="Allows critical alerts when the app is in the background."
                status={notificationStatus}
                onRequest={requestNotificationsHandler}
              />
            </div>
          )}

          {(cameraStatus === 'denied' || locationStatus === 'denied' || motionStatus === 'denied') && (
            <p className="text-center text-red-400 text-sm mt-6">
              Camera, Location, and Motion Sensor access are required. Please enable any denied permissions in your
              device's settings to continue.
            </p>
          )}

          <div className="pt-6 mt-4 border-t border-slate-700">
            <button
              onClick={onComplete}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center h-12"
              disabled={!isContinueEnabled}
            >
              Finish Setup & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionsPage;
