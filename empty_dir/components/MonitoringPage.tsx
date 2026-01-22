import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TripReport, DrowsinessEvent, EnvironmentContext } from '../types';
import { useSensorData } from '../hooks/useSensorData';
import { useEnvironment } from '../hooks/useEnvironment';
import { useDrivingAnalysis } from '../hooks/useDrivingAnalysis';
import { analyzeDrowsiness, RateLimitError } from '../services/geminiService';
import { sendNotification } from '../services/notificationService';
import { getPowerSettings } from '../services/settingsService';
import { Spinner } from './Spinner';
import { SunIcon, CloudIcon, MapIcon, TruAwakeLogo, YawnIcon, TachometerIcon, BatterySaverIcon, AlertIcon, PhoneIcon, CheckCircleIcon } from './icons';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';

// ============ CONSTANTS ============

const DROWSINESS_THRESHOLD = 75;
const ALERT_DELAY = 5000;
const RATE_LIMIT_BACKOFF = 15000;
const MAX_CHART_EVENTS = 60;
const SOS_TRIGGER_TIME = 30000; // 30 seconds for testing
const SOS_CHECK_INTERVAL = 1000;

// Emergency Helpline Numbers
const EMERGENCY_CONTACTS = {
  MOTORWAY_POLICE: {
    number: '130',
    name: 'Motorway Police',
    country: 'Pakistan'
  },
  AMBULANCE: {
    number: '115',
    name: 'Ambulance Service',
    country: 'Pakistan'
  },
  EMERGENCY: {
    number: '112',
    name: 'Emergency',
    country: 'International'
  }
};

interface MonitoringPageProps {
  onStop: (report: TripReport) => void;
  userLocation?: { latitude: number; longitude: number };
  userPhone?: string;
  driverName?: string;
  vehicleNumber?: string;
}

// ============ SUB-COMPONENTS ============

const DrowsinessGauge: React.FC<{ level: number }> = ({ level }) => {
  const percentage = Math.min(100, Math.max(0, level)) / 100;
  const angle = percentage * 180;
  const endX = 100 - 90 * Math.cos(angle * Math.PI / 180);
  const endY = 100 - 90 * Math.sin(angle * Math.PI / 180);
  const pathData = `M 10,100 A 90,90 0 0 1 ${endX},${endY}`;

  let color = "#22c55e";
  if (level > 70) color = "#ef4444";
  else if (level > 40) color = "#eab308";

  return (
    <div className="relative w-64 h-32">
      <svg viewBox="0 0 200 100" className="w-full h-full">
        <path d="M 10,100 A 90,90 0 0 1 190,100" strokeWidth="12" stroke="#334155" fill="none" strokeLinecap="round" />
        <path d={pathData} strokeWidth="12" stroke={color} fill="none" strokeLinecap="round" className="transition-all duration-500" />
      </svg>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <span className="text-5xl font-bold" style={{ color }}>{level}</span>
        <span className="text-sm text-slate-400 tracking-widest">FATIGUE LEVEL</span>
      </div>
    </div>
  );
};

const RealTimeTrendChart: React.FC<{ data: DrowsinessEvent[] }> = ({ data }) => {
  if (data.length < 2) {
    return <div className="w-full h-20" />;
  }

  const displayData = data.slice(-MAX_CHART_EVENTS);
  const chartData = displayData.length < MAX_CHART_EVENTS
    ? [...Array(MAX_CHART_EVENTS - displayData.length).fill({ level: null }), ...displayData]
    : displayData;

  return (
    <div className="w-full h-20 max-w-sm -mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid #334155', borderRadius: '0.5rem' }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(value: number) => [`${value}% Fatigue`, null]}
            cursor={false}
          />
          <Area type="monotone" dataKey="level" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#chartGradient)" isAnimationActive={false} connectNulls={true} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const EnvironmentStatusBar: React.FC<{ context: EnvironmentContext | null }> = ({ context }) => {
  if (!context) {
    return <div className="h-6 w-full animate-pulse bg-slate-800/50 rounded-md" />;
  }

  const { roadType, timeOfDay, weather, speed } = context;
  const weatherIcon = weather && ![0, 1, 2, 3].includes(weather.code) ? <CloudIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />;

  return (
    <div className="flex items-center justify-center space-x-3 text-xs text-slate-300 bg-slate-900/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-700/30">
      <div className="flex items-center space-x-1">
        <MapIcon className="w-4 h-4 text-blue-400" />
        <span className="capitalize font-semibold">{roadType}</span>
      </div>
      <span className="text-slate-600">•</span>
      <div className="flex items-center space-x-1">
        {weatherIcon}
        <span className="capitalize">{timeOfDay}</span>
      </div>
      <span className="text-slate-600">•</span>
      <div className="flex items-center space-x-1">
        <span className="font-mono font-bold">{speed !== null ? `${speed.toFixed(0)} km/h` : '--'}</span>
      </div>
    </div>
  );
};

const SOSSuccessModal: React.FC<{ contact: any; onDismiss: () => void }> = ({ contact, onDismiss }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
    <div className="bg-gradient-to-b from-green-950 to-slate-900 border-2 border-green-500 rounded-2xl p-8 max-w-md text-center shadow-2xl animate-bounce">
      <div className="mb-6 flex justify-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
          <CheckCircleIcon className="w-10 h-10 text-green-400" />
        </div>
      </div>
      <h2 className="text-3xl font-bold text-green-400 mb-2">✅ Alert Sent!</h2>
      <p className="text-slate-200 mb-4 text-lg">Emergency services notified</p>
      
      <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
        <p className="text-slate-400 text-sm mb-2">Contact Number:</p>
        <p className="text-white text-2xl font-bold font-mono">{contact.number}</p>
        <p className="text-slate-300 text-sm mt-2">{contact.name}</p>
      </div>

      <p className="text-slate-300 mb-6 text-sm">Your location and vehicle info have been sent. Help is on the way.</p>
      
      <button
        onClick={onDismiss}
        className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
      >
        Continue Monitoring
      </button>
    </div>
  </div>
);

const SOSConfirmModal: React.FC<{ onConfirm: (action: string) => void; onCancel: () => void; driverName?: string }> = ({ onConfirm, onCancel, driverName }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
    <div className="bg-gradient-to-b from-red-950 to-slate-900 border-2 border-red-500 rounded-2xl p-8 max-w-md text-center shadow-2xl animate-pulse">
      <div className="mb-6 flex justify-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
          <AlertIcon className="w-10 h-10 text-red-400" />
        </div>
      </div>
      
      <h2 className="text-3xl font-bold text-red-400 mb-2">🚨 CRITICAL ALERT</h2>
      <p className="text-slate-200 mb-6">Severe drowsiness detected for 30+ seconds</p>

      <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
        <p className="text-slate-300 text-sm mb-3">Send emergency alert to:</p>
        <div className="space-y-2">
          <button
            onClick={() => onConfirm('call')}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 text-lg"
          >
            <PhoneIcon className="w-6 h-6" />
            📞 Call 130 (Motorway Police)
          </button>
          <button
            onClick={() => onConfirm('sms')}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 text-lg"
          >
            📱 Send SMS to 130
          </button>
        </div>
      </div>

      <p className="text-slate-300 mb-6 text-sm">
        Driver: <span className="font-bold text-white">{driverName || 'Unknown'}</span>
      </p>

      <button
        onClick={onCancel}
        className="w-full px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition"
      >
        Cancel
      </button>
    </div>
  </div>
);

// ============ MAIN COMPONENT ============

const MonitoringPage: React.FC<MonitoringPageProps> = ({ 
  onStop, 
  userLocation, 
  userPhone, 
  driverName, 
  vehicleNumber 
}) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [drowsinessLevel, setDrowsinessLevel] = useState(0);
  const [cues, setCues] = useState<string[]>([]);
  const [isAlerting, setIsAlerting] = useState(false);
  const [events, setEvents] = useState<DrowsinessEvent[]>([]);
  const [yawnCount, setYawnCount] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [isAppVisible, setIsAppVisible] = useState(true);
  const [isBatterySaverEnabled, setIsBatterySaverEnabled] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [showSOSSuccess, setShowSOSSuccess] = useState(false);
  const [sosCounter, setSOSCounter] = useState(0);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [sosSent, setSOSSent] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analysisTimeoutRef = useRef<number | null>(null);
  const alertTimerRef = useRef<number | null>(null);
  const sosStartTimeRef = useRef<number | null>(null);

  const sensorData = useSensorData(isMonitoring);
  const environment = useEnvironment(isMonitoring);
  const maneuvers = useDrivingAnalysis(sensorData, isMonitoring);

  const { videoConstraints, jpegQuality, initialInterval, minInterval, maxInterval, intervalAdjustUp, intervalAdjustDown } = useMemo(() => {
    if (isBatterySaverEnabled) {
      return {
        videoConstraints: { facingMode: 'user' as const, width: { ideal: 640 }, height: { ideal: 480 } },
        jpegQuality: 0.5,
        initialInterval: 4000,
        minInterval: 3000,
        maxInterval: 8000,
        intervalAdjustUp: 750,
        intervalAdjustDown: 400,
      };
    }
    return {
      videoConstraints: { facingMode: 'user' as const, width: { ideal: 1280 }, height: { ideal: 720 } },
      jpegQuality: 0.7,
      initialInterval: 2500,
      minInterval: 1500,
      maxInterval: 5000,
      intervalAdjustUp: 500,
      intervalAdjustDown: 300,
    };
  }, [isBatterySaverEnabled]);

  const [currentAnalysisInterval, setCurrentAnalysisInterval] = useState(initialInterval);
  const latestDataRef = useRef({ sensorData, environment });
  const intervalRef = useRef(currentAnalysisInterval);

  useEffect(() => {
    latestDataRef.current = { sensorData, environment };
  }, [sensorData, environment]);

  useEffect(() => {
    intervalRef.current = currentAnalysisInterval;
  }, [currentAnalysisInterval]);

  useEffect(() => {
    const settings = getPowerSettings();
    setIsBatterySaverEnabled(settings.batterySaverEnabled);
  }, []);

  useEffect(() => {
    setCurrentAnalysisInterval(initialInterval);
  }, [initialInterval]);

  // ============ CAMERA INITIALIZATION ============
  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      if (!videoRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (isMounted) {
          setIsInitializing(false);
          setIsMonitoring(true);
          setStartTime(Date.now());
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Camera initialization failed:", errorMessage);
        if (isMounted) {
          alert("Camera permission denied. Please check your settings.");
          onStop({ startTime: Date.now(), endTime: Date.now(), events: [], maneuvers: [], maxDrowsiness: 0, alertCount: 0, yawnCount: 0 });
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [onStop, videoConstraints]);

  // ============ APP VISIBILITY HANDLING ============
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        setIsAppVisible(true);
      } else {
        setIsAppVisible(false);
        await sendNotification('Monitoring Paused', 'TruAwake is in the background. Return to resume.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ============ SOS ALERT SYSTEM ============
  useEffect(() => {
    if (!isMonitoring || sosSent || !isAppVisible) return;

    if (drowsinessLevel > DROWSINESS_THRESHOLD) {
      if (!sosStartTimeRef.current) {
        sosStartTimeRef.current = Date.now();
        console.log('⏱️ High drowsiness detected, starting SOS timer');
      }

      const elapsedTime = Date.now() - sosStartTimeRef.current;
      const elapsedSeconds = Math.floor(elapsedTime / 1000);
      setSOSCounter(elapsedSeconds);

      console.log(`⏱️ SOS Timer: ${elapsedSeconds}s / 30s`);

      if (elapsedTime >= SOS_TRIGGER_TIME && !showSOSConfirm) {
        console.warn('🚨 SOS TRIGGERED');
        setShowSOSConfirm(true);
        
        await sendNotification(
          '🚨 CRITICAL: SOS Alert',
          'Severe drowsiness for 30+ seconds. Click to send emergency alert.'
        ).catch(err => console.error('Notification error:', err));
      }
    } else {
      if (sosStartTimeRef.current) {
        console.log('✅ Drowsiness normalized, resetting SOS timer');
        sosStartTimeRef.current = null;
        setSOSCounter(0);
      }
    }
  }, [drowsinessLevel, isMonitoring, sosSent, isAppVisible, showSOSConfirm]);

  // ============ SEND SOS TO EMERGENCY ============
  const sendSOSAlert = useCallback(async (actionType: 'call' | 'sms') => {
    try {
      console.log(`📞 Sending SOS via ${actionType}...`);

      const emergencyNumber = EMERGENCY_CONTACTS.MOTORWAY_POLICE.number;
      const sosMessage = `CRITICAL: TruAwake - Severe drowsiness alert. Driver: ${driverName || 'Unknown'}, Vehicle: ${vehicleNumber || 'Unknown'}, Location: ${userLocation?.latitude || 'N/A'}, ${userLocation?.longitude || 'N/A'}, Level: ${drowsinessLevel}%. Time: ${new Date().toISOString()}`;

      if (actionType === 'call') {
        // Make phone call
        window.location.href = `tel:${emergencyNumber}`;
        console.log(`📞 Initiating call to ${emergencyNumber}`);
      } else if (actionType === 'sms') {
        // Send SMS
        window.location.href = `sms:${emergencyNumber}?body=${encodeURIComponent(sosMessage)}`;
        console.log(`📱 Sending SMS to ${emergencyNumber}`);
      }

      setSOSSent(true);
      setShowSOSConfirm(false);
      setSelectedContact(EMERGENCY_CONTACTS.MOTORWAY_POLICE);
      setShowSOSSuccess(true);

      // Log to console
      console.log('✅ SOS Initiated:', { actionType, number: emergencyNumber, message: sosMessage });

      // Auto-dismiss success modal after 5 seconds
      setTimeout(() => setShowSOSSuccess(false), 5000);
    } catch (error) {
      console.error('❌ Failed to send SOS:', error);
      await sendNotification('⚠️ SOS Failed', 'Could not initiate emergency call/SMS. Please contact emergency services manually.').catch(err => console.error('Notification error:', err));
    }
  }, [driverName, vehicleNumber, userLocation, drowsinessLevel]);

  // ============ DROWSINESS ANALYSIS LOOP ============
  useEffect(() => {
    if (!isMonitoring || !isAppVisible) {
      if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
      return;
    }

    const analysisLoop = async () => {
      if (!isMonitoring || !isAppVisible) return;

      const { sensorData, environment } = latestDataRef.current;
      let nextInterval = intervalRef.current;

      try {
        if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
          return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Canvas context not available");

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
        const base64Image = dataUrl.split(',')[1];
        if (!base64Image) throw new Error("Could not capture image");

        setApiError(null);

        const analysisStartTime = performance.now();
        const result = await analyzeDrowsiness(base64Image, sensorData, environment);
        const duration = performance.now() - analysisStartTime;

        if (isRateLimited) setIsRateLimited(false);

        if (result) {
          const level = typeof result.drowsinessLevel === 'number' && isFinite(result.drowsinessLevel) ? result.drowsinessLevel : 0;
          const currentCues = Array.isArray(result.cues) ? result.cues : [];

          setDrowsinessLevel(level);
          setCues(currentCues);

          if (currentCues.some(cue => cue.toLowerCase().includes('yawn'))) {
            setYawnCount(prev => prev + 1);
          }

          setEvents(prev => [...prev, { timestamp: Date.now(), level, cues: currentCues }]);
        }

        if (duration > nextInterval) {
          nextInterval = Math.min(maxInterval, nextInterval + intervalAdjustUp);
        } else if (duration < nextInterval * 0.6) {
          nextInterval = Math.max(minInterval, nextInterval - intervalAdjustDown);
        }
      } catch (error) {
        if (error instanceof RateLimitError) {
          setIsRateLimited(true);
          nextInterval = RATE_LIMIT_BACKOFF;
        } else {
          const message = error instanceof Error ? error.message : "Analysis error occurred";
          setApiError(message);
          nextInterval = Math.min(maxInterval, intervalRef.current + 2000);
        }
      } finally {
        if (isMonitoring && isAppVisible) {
          setCurrentAnalysisInterval(nextInterval);
          analysisTimeoutRef.current = window.setTimeout(analysisLoop, nextInterval);
        }
      }
    };

    analysisTimeoutRef.current = window.setTimeout(analysisLoop, initialInterval);

    return () => {
      if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    };
  }, [isMonitoring, isAppVisible, jpegQuality, initialInterval, maxInterval, minInterval, intervalAdjustUp, intervalAdjustDown, isRateLimited]);

  // ============ ALERT TRIGGER ============
  useEffect(() => {
    if (drowsinessLevel > DROWSINESS_THRESHOLD && !isAlerting) {
      if (alertTimerRef.current === null) {
        alertTimerRef.current = window.setTimeout(async () => {
          setIsAlerting(true);

          if (document.visibilityState === 'hidden') {
            await sendNotification('⚠️ Drowsiness Alert', 'High drowsiness detected. Pull over safely.').catch(err => console.error('Notification error:', err));
          }

          audioRef.current?.play().catch(() => {});
          navigator.vibrate?.([500, 200, 500]);
          setTimeout(() => setIsAlerting(false), 5000);
          alertTimerRef.current = null;
        }, ALERT_DELAY);
      }
    } else if (drowsinessLevel <= DROWSINESS_THRESHOLD && alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
      alertTimerRef.current = null;
    }

    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, [drowsinessLevel, isAlerting]);

  // ============ STOP MONITORING ============
  const handleStop = useCallback(() => {
    setIsMonitoring(false);
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);

    const validLevels = events.map(e => e.level).filter(l => typeof l === 'number' && isFinite(l));
    const maxDrowsiness = validLevels.length > 0 ? Math.max(...validLevels) : 0;

    onStop({
      startTime,
      endTime: Date.now(),
      events,
      maneuvers,
      maxDrowsiness,
      alertCount: events.filter(e => e.level > DROWSINESS_THRESHOLD).length,
      yawnCount,
    });
  }, [events, maneuvers, startTime, onStop]);

  // ============ RENDER ============
  return (
    <div className="relative h-full w-full flex flex-col bg-black overflow-hidden">
      {isAlerting && (
        <div className="absolute inset-0 bg-red-600/50 animate-pulse z-20" style={{ backgroundImage: 'radial-gradient(circle, transparent 0%, #dc2626 100%)' }} />
      )}

      {sosSent && (
        <div className="absolute top-4 left-4 right-4 bg-green-600/90 backdrop-blur-md border-2 border-green-400 rounded-xl p-4 z-30 flex items-start gap-4 shadow-2xl animate-pulse">
          <CheckCircleIcon className="w-8 h-8 text-green-200 flex-shrink-0 mt-1" />
          <div>
            <p className="font-bold text-green-50 text-lg">✅ Emergency Alert Sent</p>
            <p className="text-sm text-green-100">Motorway Police (130) has been notified</p>
            <p className="text-xs text-green-200 mt-1">Your location: {userLocation?.latitude.toFixed(4)}, {userLocation?.longitude.toFixed(4)}</p>
          </div>
        </div>
      )}

      <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100" />

      {!isAppVisible && !isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-center bg-slate-900/90 backdrop-blur-sm z-30">
          <div className="p-4 rounded-full border-4 border-slate-600 mb-4 animate-pulse">
            <TruAwakeLogo className="w-16 h-16 text-slate-400" />
          </div>
          <h2 className="text-3xl font-bold text-white">MONITORING PAUSED</h2>
          <p className="mt-2 text-lg text-slate-300">Return to resume protection</p>
        </div>
      )}

      {isInitializing ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-center bg-slate-900/80 z-50">
          <Spinner size="lg" />
          <p className="mt-4 text-lg text-slate-100">Initializing camera...</p>
        </div>
      ) : (
        <>
          <div className="absolute top-4 left-0 right-0 px-4 z-10 flex justify-between items-start gap-2">
            <EnvironmentStatusBar context={environment} />
            <div className="flex flex-col items-end gap-1">
              {isRateLimited && (
                <div className="flex items-center space-x-1 bg-yellow-900/80 backdrop-blur-sm px-2 py-1 rounded-full text-white border border-yellow-500 whitespace-nowrap text-xs">
                  <AlertIcon className="w-4 h-4 text-yellow-300 animate-pulse" />
                  <span className="text-yellow-300">RATE LIMITED</span>
                </div>
              )}
              {sosCounter > 0 && sosCounter < 30 && (
                <div className="flex items-center space-x-1 bg-orange-900/80 backdrop-blur-sm px-2 py-1 rounded-full text-white border border-orange-500 animate-pulse whitespace-nowrap text-xs font-bold">
                  <AlertIcon className="w-4 h-4 text-orange-300" />
                  <span className="text-orange-300">⏱️ SOS: {sosCounter}s</span>
                </div>
              )}
              {isBatterySaverEnabled && (
                <div className="flex items-center space-x-1 bg-slate-900/50 backdrop-blur-sm px-2 py-1 rounded-full text-white whitespace-nowrap text-xs">
                  <BatterySaverIcon className="w-4