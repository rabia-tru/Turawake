// components/PermissionsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  CameraIcon,
  CheckCircleIcon,
  LocationMarkerIcon,
  SensorIcon,
  XCircleIcon,
} from './icons';
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
          <div className="flex items-center space-x-1 text-xs text-green-400">
            <CheckCircleIcon className="w-4 h-4" />
            <span>Enabled</span>
          </div>
        );
      case 'denied':
        return (
          <div className="flex items-center space-x-1 text-xs text-red-400">
            <XCircleIcon className="w-4 h-4" />
            <span>Denied</span>
          </div>
        );
      default:
        return (
          <span className="text-xs text-slate-400">
            {isCritical ? 'Required' : 'Optional'}
          </span>
        );
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-lg ${
        status === 'granted'
          ? 'bg-green-500/5 shadow-green-500/10'
          : status === 'denied'
          ? 'bg-red-500/5 shadow-red-500/10'
          : 'bg-slate-800/50 hover:bg-slate-700/40 shadow-slate-900/20'
      }`}
    >
      {/* Left section */}
      <div className="flex items-center space-x-3">
        <div
          className={`p-3 rounded-xl ${
            status === 'granted'
              ? 'bg-green-500/20 text-green-400'
              : status === 'denied'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-slate-700/60 text-blue-400'
          }`}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="text-[12px] text-slate-400 leading-snug">{description}</p>
        </div>
      </div>

      {/* Right section */}
      <div className="flex flex-col items-end space-y-1">
        {status === 'prompt' && (
          <button
            onClick={onRequest}
            className="text-xs font-semibold py-1 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md active:scale-95"
          >
            Enable
          </button>
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
        setNotificationStatus('prompt');
        const geoPerm = await Geolocation.checkPermissions();
        setLocationStatus(geoPerm.location === 'granted' ? 'granted' : 'prompt');
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
        await sendNotification(
          'Notifications Enabled',
          'TruAwake notifications are now active ✅'
        );
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
      stream.getTracks().forEach((track) => track.stop());
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
      setMotionStatus('granted');
    }
  };

  const isContinueEnabled =
    cameraStatus === 'granted' &&
    locationStatus === 'granted' &&
    motionStatus === 'granted' &&
    notificationStatus === 'granted';

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      {/* Header */}
      <header className="py-8 text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
          Final Step: Enable Key Features
        </h1>
        <p className="text-slate-400 text-xs mt-2 max-w-sm mx-auto">
          Allow permissions for full functionality and a safe driving experience 🚗
        </p>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-md bg-slate-900/70 backdrop-blur-xl rounded-3xl shadow-2xl p-6 space-y-4">
          {!isSecureContext && (
            <div className="bg-yellow-500/10 text-yellow-300 text-xs rounded-lg p-3 text-center">
              <strong>⚠ Security Warning:</strong> Permissions can only be enabled on a secure
              (HTTPS) connection.
            </div>
          )}

          {isChecking ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="space-y-3">
              <PermissionCard
                icon={<CameraIcon className="w-6 h-6 text-rose-400" />}
                title="Camera Access"
                description="Allows AI to monitor for signs of drowsiness in real-time."
                status={cameraStatus}
                onRequest={requestCamera}
                isCritical
              />
              <PermissionCard
                icon={<LocationMarkerIcon className="w-6 h-6 text-emerald-400" />}
                title="Location Access"
                description="Needed for navigation, environment awareness, and alerts."
                status={locationStatus}
                onRequest={requestLocation}
                isCritical
              />
              <PermissionCard
                icon={<SensorIcon className="w-6 h-6 text-indigo-400" />}
                title="Motion Sensors"
                description="Detects braking, motion patterns, and road behavior."
                status={motionStatus}
                onRequest={requestMotion}
                isCritical
              />
              <PermissionCard
                icon={<BellIcon className="w-6 h-6 text-amber-400" />}
                title="Notifications & Alarms"
                description="Delivers background alerts and fatigue warnings."
                status={notificationStatus}
                onRequest={requestNotificationsHandler}
              />
            </div>
          )}

          {(cameraStatus === 'denied' ||
            locationStatus === 'denied' ||
            motionStatus === 'denied') && (
            <div className="bg-red-500/10 text-red-300 text-xs rounded-lg p-2 text-center">
              ⚠ Some required permissions were denied. Enable them in settings to continue.
            </div>
          )}

          <button
            onClick={onComplete}
            disabled={!isContinueEnabled}
            className={`w-full py-2.5 mt-3 rounded-xl text-sm font-semibold transition-all ${
              isContinueEnabled
                ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-green-500 hover:scale-105 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            Finish Setup & Continue →
          </button>
        </div>
      </main>
    </div>
  );
};

export default PermissionsPage;
