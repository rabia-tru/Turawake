
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TripReport, DrowsinessEvent, EnvironmentContext } from '../types';
import { useSensorData } from '../hooks/useSensorData';
import { useEnvironment } from '../hooks/useEnvironment';
import { useDrivingAnalysis } from '../hooks/useDrivingAnalysis';
import { analyzeDrowsiness, RateLimitError, getSafetyTip } from '../services/geminiService';
import { sendNotification } from '../services/notificationService';
import { getPowerSettings } from '../services/settingsService';
import { Spinner } from './Spinner';
import { SunIcon, CloudIcon, MapIcon, TruAwakeLogo, YawnIcon, TachometerIcon, AlertIcon, PhoneIcon, ClockIcon, MessageCircleIcon, LightbulbIcon, GameIcon, XCircleIcon } from './icons';

const DROWSINESS_THRESHOLD = 75;
const ALERT_DELAY = 5000;
const RATE_LIMIT_BACKOFF = 15000;
const MAX_CHART_EVENTS = 60;
const RECOMMENDED_BREAK_INTERVAL = 7200000; 

// Notification Intervals (in milliseconds)
const SAFETY_TIP_INTERVAL = 60000; // Show a tip every 1 minute
const GAME_PROMPT_INTERVAL = 300000; // Prompt for a game every 5 minutes

interface MonitoringPageProps {
  onStop: (report: TripReport) => void;
}

const DrowsinessRing: React.FC<{ level: number }> = ({ level }) => {
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (level / 100) * circumference;

  let color = "#10b981"; // green
  if (level > 70) color = "#ef4444"; // red
  else if (level > 40) color = "#f59e0b"; // yellow

  return (
    <div className="relative flex flex-col items-center justify-center w-40 h-40">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
             <circle
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={stroke}
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
             <circle
                stroke={color}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                style={{ 
                    strokeDasharray: `${circumference} ${circumference}`, 
                    strokeDashoffset,
                    transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.5s ease'
                }}
            />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
             <span className="text-4xl font-bold text-white tracking-tighter" style={{ textShadow: `0 0 20px ${color}` }}>{level}%</span>
             <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Fatigue</span>
        </div>
    </div>
  );
};

const EnvironmentHUD: React.FC<{ context: EnvironmentContext | null }> = ({ context }) => {
    if (!context) return <div className="h-8 w-32 bg-slate-800/50 rounded-full animate-pulse"></div>;
    
    const { roadType, timeOfDay, weather, speed } = context;
    const weatherIcon = weather && ![0,1,2,3].includes(weather.code) ? <CloudIcon className="w-4 h-4 text-blue-300" /> : <SunIcon className="w-4 h-4 text-yellow-300" />;

    return (
        <div className="flex items-center space-x-4 bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl shadow-2xl">
            <div className="flex items-center space-x-2">
                <MapIcon className="w-4 h-4 text-blue-400" />
                <div>
                     <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold leading-none">Road</p>
                     <p className="text-sm font-bold text-white capitalize leading-none mt-0.5">{roadType}</p>
                </div>
            </div>
            <div className="w-px h-6 bg-white/10"></div>
             <div className="flex items-center space-x-2">
                {weatherIcon}
                <div>
                     <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold leading-none">Weather</p>
                     <p className="text-sm font-bold text-white capitalize leading-none mt-0.5">{timeOfDay}</p>
                </div>
            </div>
             <div className="w-px h-6 bg-white/10"></div>
            <div className="flex items-center space-x-2">
                <TachometerIcon className="w-4 h-4 text-green-400" />
                <div>
                     <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold leading-none">Speed</p>
                     <p className="text-sm font-bold text-white leading-none mt-0.5">{speed !== null ? speed.toFixed(0) : '--'} <span className="text-[10px] font-normal text-slate-400">km/h</span></p>
                </div>
            </div>
        </div>
    )
}

// --- Notification Overlay Component ---
type NotificationType = 'tip' | 'game' | 'alert';
interface NotificationState {
    show: boolean;
    type: NotificationType;
    message: string;
    action?: string;
    onAction?: () => void;
}

const NotificationOverlay: React.FC<{ notification: NotificationState; onClose: () => void }> = ({ notification, onClose }) => {
    if (!notification.show) return null;

    const bgColors = {
        tip: 'bg-slate-900/90 border-blue-500/30',
        game: 'bg-indigo-900/90 border-indigo-500/30',
        alert: 'bg-red-900/90 border-red-500/30'
    };
    
    const icons = {
        tip: <LightbulbIcon className="w-6 h-6 text-yellow-400" />,
        game: <GameIcon className="w-6 h-6 text-indigo-400" />,
        alert: <AlertIcon className="w-6 h-6 text-red-400" />
    };

    return (
        <div className={`absolute top-20 left-4 right-4 z-50 rounded-2xl p-4 border backdrop-blur-md shadow-2xl flex items-start gap-4 animate-fade-in-up ${bgColors[notification.type]}`}>
            <div className="p-2 bg-white/10 rounded-full flex-shrink-0">
                {icons[notification.type]}
            </div>
            <div className="flex-grow">
                <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-1">
                    {notification.type === 'game' ? 'Active Challenge' : notification.type === 'tip' ? 'Safety Insight' : 'Alert'}
                </h4>
                <p className="text-slate-200 text-sm leading-relaxed">{notification.message}</p>
                {notification.action && (
                    <button 
                        onClick={notification.onAction}
                        className="mt-3 text-xs font-bold bg-white text-slate-900 px-4 py-2 rounded-full hover:bg-slate-200 transition"
                    >
                        {notification.action}
                    </button>
                )}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
                <XCircleIcon className="w-6 h-6" />
            </button>
        </div>
    );
};


const MonitoringPage: React.FC<MonitoringPageProps> = ({ onStop }) => {
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
  const [showBreakRecommendation, setShowBreakRecommendation] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  
  // Notification State
  const [inAppNotification, setInAppNotification] = useState<NotificationState>({ show: false, type: 'tip', message: '' });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analysisTimeoutRef = useRef<number | null>(null);
  const alertTimerRef = useRef<number | null>(null);
  const breakTimerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Timers for Tips and Games
  const tipTimerRef = useRef<number | null>(null);
  const gameTimerRef = useRef<number | null>(null);
  
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

  useEffect(() => { latestDataRef.current = { sensorData, environment }; }, [sensorData, environment]);
  useEffect(() => { intervalRef.current = currentAnalysisInterval; }, [currentAnalysisInterval]);
  useEffect(() => { 
      const settings = getPowerSettings(); 
      setIsBatterySaverEnabled(settings.batterySaverEnabled); 
      setCurrentAnalysisInterval(initialInterval);
  }, [initialInterval]);
  
  // --- Periodic Notifications Logic ---
  useEffect(() => {
    if (isMonitoring && startTime > 0) {
        
        // 1. Safety Tips Interval
        tipTimerRef.current = window.setInterval(async () => {
            if (isAlerting) return; // Don't show tips during critical alerts
            const tip = await getSafetyTip();
            setInAppNotification({
                show: true,
                type: 'tip',
                message: tip
            });
            
            // Auto-hide after 8 seconds
            setTimeout(() => {
                setInAppNotification(prev => prev.type === 'tip' ? { ...prev, show: false } : prev);
            }, 8000);
        }, SAFETY_TIP_INTERVAL);

        // 2. Game Prompts Interval
        gameTimerRef.current = window.setInterval(() => {
             if (isAlerting) return;
             setInAppNotification({
                 show: true,
                 type: 'game',
                 message: "Stay sharp! Pull over safely and try a quick reflex test to wake up your brain.",
                 action: "Stop & Play",
                 onAction: () => {
                     // Trigger stop, which usually navigates to report, but user can then go to Break Zone.
                     // Ideally, we'd navigate directly to BreakZone, but keeping existing flow:
                     handleStop(); 
                 }
             });
        }, GAME_PROMPT_INTERVAL);
    }

    return () => {
        if (tipTimerRef.current) clearInterval(tipTimerRef.current);
        if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [isMonitoring, startTime, isAlerting]);


  // Robust Camera Initialization for Mobile
  useEffect(() => {
    let isMounted = true;
    
    const startCamera = async () => {
      if (!videoRef.current) return;
      
      try {
        let stream: MediaStream | null = null;
        
        // Attempt to get user media, falling back to basic constraints if ideal ones fail
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        } catch (err) {
            console.warn("Preferred video constraints failed, trying basic video.", err);
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (fatalErr) {
                throw new Error("Could not access camera even with basic constraints.");
            }
        }

        if (!isMounted) {
            stream?.getTracks().forEach(track => track.stop());
            return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        
        const handleVideoReady = async () => {
             if(!isMounted) return;
             try {
                 await video.play();
                 if (isMounted) {
                    setIsInitializing(false);
                    setIsMonitoring(true);
                    setStartTime(Date.now());
                 }
             } catch (playError) {
                 console.error("Auto-play blocked or failed:", playError);
                 alert("Tap screen if video does not start.");
             }
        };

        // Attach listener BEFORE setting source to catch immediate events
        video.onloadedmetadata = handleVideoReady;
        video.srcObject = stream;
        
        // Fallback: If readyState is already enough, trigger manually
        if (video.readyState >= 1) {
            handleVideoReady();
        }

      } catch (err) {
        console.error("Camera Init Error:", err);
        if (isMounted) {
            alert("Unable to access camera. Please check your device permissions.");
        }
      }
    };
    
    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.onloadedmetadata = null;
      }
    };
  }, [videoConstraints]);

  // Break Reminder Logic
  useEffect(() => {
      if(isMonitoring && startTime > 0) {
          breakTimerIntervalRef.current = window.setInterval(() => {
              const driveDuration = Date.now() - startTime;
              if (driveDuration > RECOMMENDED_BREAK_INTERVAL) {
                  if (!showBreakRecommendation) {
                      setShowBreakRecommendation(true);
                      sendNotification(
                          "Break Recommended", 
                          "You've been driving for 2 hours. Please find a rest area and stretch your legs."
                      );
                  }
              }
          }, 60000); // Check every minute
      }
      return () => {
          if (breakTimerIntervalRef.current) clearInterval(breakTimerIntervalRef.current);
      }
  }, [isMonitoring, startTime, showBreakRecommendation]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') setIsAppVisible(true);
      else {
        setIsAppVisible(false);
        await sendNotification('Monitoring Paused', 'Tap to resume.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isMonitoring || !isAppVisible) { if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current); return; }

    const analysisLoop = async () => {
      if (!isMonitoring || !isAppVisible) return;
      const { sensorData, environment } = latestDataRef.current;
      let nextInterval = intervalRef.current;

      try {
        if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Canvas context not available");

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
        const base64Image = dataUrl.split(',')[1];
        
        setApiError(null);
        const start = performance.now();
        const result = await analyzeDrowsiness(base64Image, sensorData, environment);
        const duration = performance.now() - start;
        
        if (isRateLimited) setIsRateLimited(false);

        if (result) {
          const level = typeof result.drowsinessLevel === 'number' && isFinite(result.drowsinessLevel) ? result.drowsinessLevel : 0;
          const currentCues = Array.isArray(result.cues) ? result.cues : [];
          setDrowsinessLevel(level);
          setCues(currentCues);
          if (currentCues.some(cue => cue.toLowerCase().includes('yawn'))) setYawnCount(p => p + 1);
          setEvents(p => [...p, { timestamp: Date.now(), level, cues: currentCues }]);
        }
        
        if (duration > nextInterval) nextInterval = Math.min(maxInterval, nextInterval + intervalAdjustUp);
        else if (duration < nextInterval * 0.6) nextInterval = Math.max(minInterval, nextInterval - intervalAdjustDown);

      } catch (error) {
        if (error instanceof RateLimitError) {
          setIsRateLimited(true);
          nextInterval = RATE_LIMIT_BACKOFF;
        } else {
            const msg = error instanceof Error ? error.message : "Unknown error";
            setApiError(msg);
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
    return () => { if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current); };
  }, [isMonitoring, isAppVisible, jpegQuality, initialInterval, maxInterval, minInterval, intervalAdjustUp, intervalAdjustDown, isRateLimited]);
  
  useEffect(() => {
    if (drowsinessLevel > DROWSINESS_THRESHOLD && !isAlerting) {
      if (alertTimerRef.current === null) {
        alertTimerRef.current = window.setTimeout(async () => {
          setIsAlerting(true);
          // Hide any gentle notifications when alert triggers
          setInAppNotification(prev => ({ ...prev, show: false }));
          
          if (document.visibilityState === 'hidden') {
              await sendNotification('Critical Alert!', 'You are showing signs of drowsiness. Pull over and play a brain teaser to refresh.');
          }
          audioRef.current?.play();
          navigator.vibrate?.([500, 200, 500]);
          setTimeout(() => setIsAlerting(false), 5000);
          alertTimerRef.current = null;
        }, ALERT_DELAY);
      }
    } else if (drowsinessLevel <= DROWSINESS_THRESHOLD && alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
      alertTimerRef.current = null;
    }
    return () => { if (alertTimerRef.current) clearTimeout(alertTimerRef.current); };
  }, [drowsinessLevel, isAlerting]);

  const handleStop = () => {
    setIsMonitoring(false);
    const validLevels = events.map(e => e.level).filter(l => typeof l === 'number' && isFinite(l));
    const maxDrowsiness = validLevels.length > 0 ? Math.max(...validLevels) : 0;
    onStop({ startTime, endTime: Date.now(), events, maneuvers, maxDrowsiness, alertCount: events.filter(e => e.level > DROWSINESS_THRESHOLD).length, yawnCount });
  };
  
  const handleAbortInitialization = () => {
    handleStop();
  };

  return (
    <div className={`relative h-full w-full flex flex-col bg-black overflow-hidden`}>
        {isAlerting && <div className="absolute inset-0 z-20 animate-pulse bg-red-600/40 mix-blend-overlay pointer-events-none"></div>}
        
        {/* In-Ride Notification Overlay (Tips / Game Prompts) */}
        <NotificationOverlay 
            notification={inAppNotification} 
            onClose={() => setInAppNotification(prev => ({ ...prev, show: false }))} 
        />

        {/* Video Feed with HUD Overlay */}
        <div className="absolute inset-0">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100 opacity-60"></video>
            {/* Professional Grid & Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none"></div>
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            
            {/* Scanning Line Animation */}
            {isMonitoring && !isInitializing && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="w-full h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_3s_ease-in-out_infinite]"></div>
                </div>
            )}
        </div>

        {/* SOS Modal Overlay */}
        {showSOSModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in-up">
                <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 w-11/12 max-w-sm text-center shadow-[0_0_50px_rgba(239,68,68,0.3)]">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <PhoneIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Emergency Assistance</h2>
                    <p className="text-slate-400 mb-6 text-sm">Contact Motorway Police (130) for immediate help.</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <a href="tel:130" className="flex flex-col items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-xl p-4 transition active:scale-95">
                            <PhoneIcon className="w-6 h-6 mb-2" />
                            <span className="font-bold">CALL 130</span>
                        </a>
                        <a href="sms:130?body=Help needed" className="flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl p-4 transition active:scale-95">
                            <MessageCircleIcon className="w-6 h-6 mb-2 text-blue-400" />
                            <span className="font-bold">SMS 130</span>
                        </a>
                    </div>
                    
                    <button 
                        onClick={() => setShowSOSModal(false)}
                        className="text-slate-500 hover:text-white text-sm font-medium py-2"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )}

        {/* Paused State */}
        {!isAppVisible && !isInitializing && !showSOSModal && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md z-30">
                <div className="p-5 bg-slate-800 rounded-full mb-4 animate-pulse shadow-2xl border border-slate-700">
                    <TruAwakeLogo className="w-20 h-20 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Monitoring Paused</h2>
            </div>
        )}

        {isInitializing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-50">
                <Spinner size="lg"/>
                <p className="mt-6 text-blue-200 font-mono animate-pulse tracking-widest text-xs uppercase mb-4">Initializing AI Systems...</p>
                
                {/* Cancel button in case initialization hangs */}
                <button 
                    onClick={handleAbortInitialization}
                    className="mt-4 px-4 py-2 bg-slate-800/80 rounded-full text-slate-400 hover:text-white text-xs border border-slate-700 hover:bg-slate-700 transition"
                >
                    Cancel
                </button>
            </div>
        ) : (
            <>
                {/* Top Bar: HUD & SOS */}
                <div className="absolute top-0 left-0 right-0 p-4 z-40 flex justify-between items-start">
                    <EnvironmentHUD context={environment} />
                    
                    <button 
                        onClick={() => setShowSOSModal(true)}
                        className="group flex flex-col items-center justify-center w-14 h-14 bg-red-500/20 backdrop-blur-md border border-red-500 rounded-xl hover:bg-red-600 transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] active:scale-95"
                    >
                        <AlertIcon className="w-6 h-6 text-red-500 group-hover:text-white transition-colors" />
                        <span className="text-[10px] font-bold text-red-400 group-hover:text-white mt-0.5">SOS</span>
                    </button>
                </div>

                {/* Center Content */}
                <div className="relative flex-grow flex flex-col items-center justify-center z-10 w-full mt-10">
                    
                    <div className="scale-110 sm:scale-125 transition-transform mb-8">
                        <DrowsinessRing level={drowsinessLevel} />
                    </div>

                    <div className="text-center mb-8 relative z-20">
                        {isRateLimited ? (
                            <div className="text-yellow-400 font-mono text-xs animate-pulse bg-yellow-900/40 px-3 py-1 rounded-full border border-yellow-500/20">THROTTLING ANALYSIS...</div>
                        ) : apiError ? (
                            <div className="text-red-400 font-mono text-xs bg-red-900/50 px-3 py-1 rounded-full border border-red-500/20">{apiError}</div>
                        ) : (
                            <div className="inline-flex items-center space-x-2 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <p className="text-lg font-bold text-white capitalize tracking-wide">
                                    {cues.length > 0 ? cues[0] : 'Active Monitoring'}
                                </p>
                            </div>
                        )}
                        {cues.length > 1 && <p className="text-xs text-blue-200 mt-2 font-mono bg-black/40 px-2 py-0.5 rounded inline-block border border-white/5">+{cues.length - 1} other signs detected</p>}
                    </div>
                </div>

                {/* Bottom Bar: Stats & Controls */}
                <div className="relative z-40 bg-slate-900/80 backdrop-blur-lg border-t border-slate-700/50 p-4 pb-8 flex flex-col items-center gap-4">
                     <div className="flex w-full justify-between max-w-sm px-4 text-xs font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <TachometerIcon className="w-3.5 h-3.5" />
                            <span>{(1000 / currentAnalysisInterval).toFixed(1)} FPS</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                             <YawnIcon className="w-3.5 h-3.5 text-yellow-500" />
                            <span>{yawnCount} Yawns</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>{Math.floor((Date.now() - startTime) / 60000)}m</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleStop} 
                        className="w-full max-w-xs py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-600 shadow-lg active:scale-95 active:bg-slate-900 transition-all tracking-widest text-sm"
                    >
                        END TRIP
                    </button>
                </div>
            </>
        )}
        
        <canvas ref={canvasRef} className="hidden"></canvas>
        <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" preload="auto"></audio>
        
        <style>{`
            @keyframes scan {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
            }
        `}</style>
    </div>
  );
};

export default MonitoringPage;
