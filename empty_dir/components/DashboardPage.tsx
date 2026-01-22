import React, { useState, useEffect, useRef } from 'react';
import { TripReport, Vehicle, WeatherInfo, Profile } from '../types';
import { 
    TruAwakeLogo, 
    LogoutIcon, 
    StartIcon, 
    ReportIcon, 
    SunIcon, 
    CloudIcon,
    LightbulbIcon, 
    AlertIcon,
    PencilIcon,
    SettingsIcon,
    MapIcon,
    HistoryIcon,
    BellIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChevronRightIcon,
    GameIcon
} from './icons';
import { User } from '@supabase/supabase-js';
import { getSafetyTip } from '../services/geminiService';
import { getWeather } from '../services/environmentService';
import { 
    checkNotificationStatus, 
    requestNotifications, 
    sendNotification, 
    initializeNotifications 
} from '../services/notificationService';
import { Spinner } from './Spinner';

interface DashboardPageProps {
  user: User | null;
  profile: Profile | null;
  vehicle: Vehicle | null;
  onStart: () => void;
  onViewReport: () => void;
  onLogout: () => void;
  onManageVehicle: () => void;
  onGoToSettings: () => void;
  onGoToMap: () => void;
  onGoToHistory: () => void;
  onGoToBreakZone: () => void;
  lastTripReport: TripReport | null;
}

const WidgetCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = "", onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-lg transition-all duration-300 hover:bg-slate-800/80 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''} ${className}`}
    >
        {children}
    </div>
);

const WeatherWidget: React.FC = () => {
    const [weather, setWeather] = useState<(WeatherInfo & { temp: number }) | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            const weatherData = await getWeather(latitude, longitude);
            if (weatherData && weatherData.temp !== null) {
                setWeather(weatherData as WeatherInfo & { temp: number });
            }
            setLoading(false);
        }, (error) => {
            console.warn("Could not get location for weather:", error.message);
            setLoading(false);
        });
    }, []);

    const getWeatherIcon = (code: number) => {
        if ([0, 1].includes(code)) return <SunIcon className="w-8 h-8 text-yellow-300" />;
        if ([2, 3].includes(code)) return <CloudIcon className="w-8 h-8 text-slate-300" />;
        if (code >= 51 && code <= 67) return <CloudIcon className="w-8 h-8 text-blue-300" />; 
        return <CloudIcon className="w-8 h-8 text-slate-400" />; 
    };

    if (loading) return <WidgetCard className="flex items-center justify-center min-h-[100px]"><Spinner size="sm" /></WidgetCard>;

    if (!weather) {
        return (
             <WidgetCard className="flex items-center space-x-3">
                <div className="p-2 bg-slate-700/50 rounded-full"><XCircleIcon className="w-5 h-5 text-slate-400" /></div>
                <div>
                    <p className="font-semibold text-slate-300">Weather Unavailable</p>
                    <p className="text-xs text-slate-500">Enable location services</p>
                </div>
            </WidgetCard>
        );
    }
    
    return (
        <WidgetCard className="flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-colors"></div>
            <div className="flex items-center space-x-4 z-10">
                {getWeatherIcon(weather.code)}
                <div>
                    <p className="text-3xl font-bold text-white tracking-tight">{Math.round(weather.temp)}&deg;</p>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{weather.description}</p>
                </div>
            </div>
        </WidgetCard>
    );
};

type PermissionStatus = 'prompt' | 'granted' | 'denied';

const NotificationPermissionWidget: React.FC = () => {
    const [permission, setPermission] = useState<PermissionStatus>('prompt');
    const [isChecking, setIsChecking] = useState(true);
    const [isRequesting, setIsRequesting] = useState(false);
    const [testSent, setTestSent] = useState(false);

    // Initialize on component mount
    useEffect(() => {
        const init = async () => {
            try {
                setIsChecking(true);
                console.log('🔔 [Dashboard] Initializing notifications...');

                // Initialize notification system
                await initializeNotifications();
                
                // Check current status
                const status = await checkNotificationStatus();
                console.log('🔔 [Dashboard] Initial permission status:', status);
                setPermission(status);
            } catch (error) {
                console.error('❌ [Dashboard] Error initializing notifications:', error);
                setPermission('denied');
            } finally {
                setIsChecking(false);
            }
        };

        init();
    }, []);

    const handleRequestPermission = async () => {
        setIsRequesting(true);
        setTestSent(false);
        try {
            console.log('🔔 [Dashboard] User clicked Allow button');
            
            const result = await requestNotifications();
            console.log('🔔 [Dashboard] Permission request result:', result);

            setPermission(result === 'granted' ? 'granted' : 'denied');

            // Send test notification if granted
            if (result === 'granted') {
                console.log('✅ [Dashboard] Permission granted! Sending test notification...');
                
                // Wait a bit before sending
                await new Promise(resolve => setTimeout(resolve, 500));
                
                try {
                    await sendNotification(
                        '✅ Alerts Enabled',
                        'TruAwake notifications are working! 🎉'
                    );
                    console.log('✅ [Dashboard] Test notification sent successfully');
                    setTestSent(true);
                } catch (error) {
                    console.error('❌ [Dashboard] Error sending test notification:', error);
                }
            } else {
                console.warn('❌ [Dashboard] Permission was denied by user');
            }
        } catch (error) {
            console.error('❌ [Dashboard] Error requesting permission:', error);
            setPermission('denied');
        } finally {
            setIsRequesting(false);
        }
    };

    // Loading state
    if (isChecking) {
        return (
            <WidgetCard className="flex items-center justify-center min-h-[100px]">
                <Spinner size="sm" />
            </WidgetCard>
        );
    }

    // Granted state
    if (permission === 'granted') {
        return (
            <WidgetCard className="flex items-center space-x-3 border-green-500/20 bg-green-500/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-green-500/10 rounded-full blur-xl group-hover:bg-green-500/20 transition-colors"></div>
                <div className="p-2 bg-green-500/10 rounded-full z-10">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                </div>
                <div className="z-10 flex-grow">
                    <p className="font-semibold text-green-400 text-sm">✅ Alerts Active</p>
                    <p className="text-xs text-slate-500">{testSent ? 'Test notification sent ✓' : 'You are protected'}</p>
                </div>
            </WidgetCard>
        );
    }

    // Denied state
    if (permission === 'denied') {
        return (
            <WidgetCard className="flex items-center space-x-3 border-red-500/20 bg-red-500/5">
                <div className="p-2 bg-red-500/10 rounded-full">
                    <XCircleIcon className="w-5 h-5 text-red-400" />
                </div>
                <div>
                    <p className="font-semibold text-red-400 text-sm">❌ Alerts Blocked</p>
                    <p className="text-xs text-slate-500">Enable in device settings</p>
                </div>
            </WidgetCard>
        );
    }

    // Prompt state (ask for permission)
    return (
        <WidgetCard className="flex items-center justify-between border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-500/10 rounded-full">
                    <BellIcon className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                    <p className="font-semibold text-yellow-400 text-sm">⏳ Enable Alerts</p>
                    <p className="text-xs text-slate-500">Required for your safety</p>
                </div>
            </div>
            <button
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="text-xs font-bold text-yellow-400 hover:text-yellow-300 disabled:text-yellow-600 px-4 py-2 bg-yellow-400/10 hover:bg-yellow-400/20 disabled:bg-yellow-400/5 rounded-full border border-yellow-400/20 transition disabled:cursor-not-allowed whitespace-nowrap ml-4"
            >
                {isRequesting ? 'Requesting...' : 'Allow'}
            </button>
        </WidgetCard>
    );
};


const DashboardPage: React.FC<DashboardPageProps> = ({
    user,
    profile,
    vehicle,
    onStart,
    onViewReport,
    onLogout,
    onManageVehicle,
    onGoToSettings,
    onGoToMap,
    onGoToHistory,
    onGoToBreakZone,
    lastTripReport
}) => {
    const [safetyTip, setSafetyTip] = useState('');

    useEffect(() => {
        getSafetyTip().then(setSafetyTip);
    }, []);

    const firstName = profile?.full_name?.split(' ')[0] || 'Driver';

    return (
        <div className="h-full w-full bg-pro-gradient p-6 overflow-y-auto animate-app-fade-in custom-scrollbar">
            {/* Header */}
            <header className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <TruAwakeLogo className="w-12 h-12 filter drop-shadow-md" />
                        <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
                    </div>
                    <div>
                        <p className="text-xs text-blue-400 font-bold tracking-wider uppercase">Welcome Back</p>
                        <h1 className="text-2xl font-bold text-slate-100 leading-none">{firstName}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-800/50 rounded-full p-1 border border-slate-700/50">
                    <button onClick={onGoToMap} className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition" aria-label="Map"><MapIcon className="w-5 h-5" /></button>
                    <button onClick={onGoToHistory} className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition" aria-label="History"><HistoryIcon className="w-5 h-5" /></button>
                    <button onClick={onGoToSettings} className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition" aria-label="Settings"><SettingsIcon className="w-5 h-5" /></button>
                    <div className="w-px h-6 bg-slate-700 mx-1"></div>
                    <button onClick={onLogout} className="p-2.5 rounded-full text-red-400 hover:bg-red-500/10 transition" aria-label="Logout"><LogoutIcon className="w-5 h-5" /></button>
                </div>
            </header>

            <main className="space-y-6 max-w-2xl mx-auto">
                {/* Hero Start Button */}
                <button 
                    onClick={onStart} 
                    className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:shadow-blue-500/25 border border-white/10"
                >
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="text-left">
                            <h2 className="text-3xl font-bold text-white mb-1">Start Driving</h2>
                            <p className="text-blue-100 text-sm">Activate AI Co-Pilot Protection</p>
                        </div>
                        <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 shadow-inner">
                             <StartIcon className="w-8 h-8 text-white ml-1" />
                        </div>
                    </div>
                </button>

                {/* Status Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <WeatherWidget />
                    <NotificationPermissionWidget />
                </div>

                {/* Engagement / Games Widget */}
                <WidgetCard onClick={onGoToBreakZone} className="relative overflow-hidden border-teal-500/30">
                    <div className="flex justify-between items-center">
                         <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-teal-500/10 rounded-lg"><GameIcon className="w-6 h-6 text-teal-400" /></div>
                            <div>
                                <h3 className="font-semibold text-slate-200">Rest Stop & Play</h3>
                                <p className="text-xs text-slate-500">Test your alertness with a game</p>
                            </div>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-slate-500" />
                    </div>
                </WidgetCard>

                {/* Last Trip Card */}
                {lastTripReport ? (
                    <WidgetCard className="col-span-1 sm:col-span-2">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-slate-200 font-semibold flex items-center gap-2">
                                    <ReportIcon className="w-4 h-4 text-slate-400" />
                                    Last Trip Summary
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">{new Date(lastTripReport.endTime).toLocaleDateString()} &bull; {new Date(lastTripReport.endTime).toLocaleTimeString()}</p>
                            </div>
                            <button onClick={onViewReport} className="text-blue-400 hover:text-blue-300 transition"><ChevronRightIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2">
                            <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/50">
                                <span className="block text-2xl font-bold text-white">{Math.round((lastTripReport.endTime - lastTripReport.startTime) / 60000)}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Minutes</span>
                            </div>
                            <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/50">
                                <span className="block text-2xl font-bold text-red-400">{lastTripReport.maxDrowsiness}%</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Max Fatigue</span>
                            </div>
                            <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/50">
                                <span className="block text-2xl font-bold text-yellow-400">{lastTripReport.alertCount}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Alerts</span>
                            </div>
                        </div>
                    </WidgetCard>
                ) : (
                     <WidgetCard className="flex flex-col items-center justify-center py-8 border-dashed border-2 border-slate-700 bg-transparent">
                        <div className="bg-slate-800 p-3 rounded-full mb-3"><StartIcon className="w-6 h-6 text-slate-500" /></div>
                        <p className="text-slate-400 text-sm">No recent trips.</p>
                        <p className="text-slate-600 text-xs mt-1">Start driving to generate a report.</p>
                    </WidgetCard>
                )}
                
                {/* Vehicle & Tips Grid */}
                <div className="grid grid-cols-1 gap-4">
                    <WidgetCard>
                        <div className="flex justify-between items-center">
                             <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-blue-500/10 rounded-lg"><CheckCircleIcon className="w-5 h-5 text-blue-400" /></div>
                                <div>
                                    <h3 className="font-semibold text-slate-200">{vehicle?.make || 'No Vehicle'} {vehicle?.model}</h3>
                                    <p className="text-xs text-slate-500 font-mono">{vehicle?.license_plate || '--- ---'}</p>
                                </div>
                            </div>
                            <button onClick={onManageVehicle} className="p-2 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-600 rounded-lg transition">
                                <PencilIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </WidgetCard>
                    
                    <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/10 rounded-2xl p-4 flex items-start space-x-3">
                         <LightbulbIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                         <div>
                             <p className="text-xs font-bold text-yellow-500 uppercase tracking-wide mb-1">Safety Tip</p>
                             <p className="text-sm text-yellow-100/80 italic leading-relaxed">"{safetyTip || 'Loading tip...'}"</p>
                         </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;