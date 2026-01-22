
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
    GameIcon,
    ClockIcon,
    PeakIcon
} from './icons';
import { User } from '@supabase/supabase-js';
import { getSafetyTip } from '../services/geminiService';
import { getWeather } from '../services/environmentService';
import { requestNotificationPermission } from '../services/notificationService';
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

const WidgetCard: React.FC<{ 
    children: React.ReactNode; 
    className?: string; 
    onClick?: () => void;
    title?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
}> = ({ children, className = "", onClick, title, icon, action }) => (
    <div 
        onClick={onClick}
        className={`bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl transition-all duration-300 hover:border-white/10 group overflow-hidden relative ${onClick ? 'cursor-pointer hover:bg-slate-800/40 hover:-translate-y-1' : ''} ${className}`}
    >
        {/* Subtle gradient background for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        
        {(title || icon) && (
            <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    {icon && <div className="text-slate-400 group-hover:text-blue-400 transition-colors">{icon}</div>}
                    {title && <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{title}</h3>}
                </div>
                {action}
            </div>
        )}
        <div className="relative z-10 h-full">
            {children}
        </div>
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
        if ([0, 1].includes(code)) return <SunIcon className="w-8 h-8 text-amber-400 drop-shadow-lg" />;
        if ([2, 3].includes(code)) return <CloudIcon className="w-8 h-8 text-slate-400 drop-shadow-lg" />;
        if (code >= 51 && code <= 67) return <CloudIcon className="w-8 h-8 text-blue-400 drop-shadow-lg" />; 
        return <CloudIcon className="w-8 h-8 text-slate-400" />; 
    };

    if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="sm" /></div>;

    if (!weather) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <XCircleIcon className="w-6 h-6 text-slate-600 mb-1" />
                <span className="text-xs text-slate-500">Weather Unavailable</span>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
                <div>
                    <span className="text-4xl font-bold text-slate-100 tracking-tighter">{Math.round(weather.temp)}°</span>
                    <p className="text-xs text-slate-400 font-medium uppercase mt-1">{weather.description}</p>
                </div>
                {getWeatherIcon(weather.code)}
            </div>
            <div className="mt-2 w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-amber-400 h-full w-2/3"></div>
            </div>
        </div>
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
    
    // Greeting logic based on time
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="h-full w-full bg-slate-950 p-6 overflow-y-auto custom-scrollbar relative">
            {/* Background Ambience */}
            <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Header */}
            <header className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center space-x-4">
                    <div className="relative group cursor-pointer" onClick={onGoToSettings}>
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center shadow-lg group-hover:border-blue-500/50 transition-colors">
                            <span className="text-xl font-bold text-slate-300 group-hover:text-blue-400">{firstName.charAt(0)}</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">{greeting}</p>
                        <h1 className="text-2xl font-bold text-slate-100">{firstName}</h1>
                    </div>
                </div>
                
                <button onClick={onLogout} className="p-3 bg-slate-900/50 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 rounded-xl transition-all group">
                    <LogoutIcon className="w-5 h-5 text-slate-400 group-hover:text-red-400" />
                </button>
            </header>

            <main className="space-y-6 max-w-4xl mx-auto relative z-10 pb-20">
                
                {/* Hero Start Button */}
                <div 
                    onClick={onStart}
                    className="w-full relative group cursor-pointer overflow-hidden rounded-[2.5rem] p-1 shadow-2xl shadow-blue-900/20 transition-transform duration-500 hover:scale-[1.01]"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-[2.5rem] opacity-90 group-hover:opacity-100 transition-opacity"></div>
                    
                    {/* Animated Grain/Noise Overlay */}
                    <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

                    <div className="relative bg-slate-950/20 backdrop-blur-sm rounded-[2.25rem] px-8 py-10 flex items-center justify-between border border-white/10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-blue-100 uppercase tracking-widest border border-white/10">AI Active</span>
                                <span className="px-3 py-1 bg-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-300 uppercase tracking-widest border border-emerald-500/20">Systems Ready</span>
                            </div>
                            <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Start Driving</h2>
                            <p className="text-blue-100/70 text-sm font-medium">Initialize co-pilot monitoring sequence.</p>
                        </div>
                        
                        <div className="h-20 w-20 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)] group-hover:scale-110 transition-transform duration-300">
                             <StartIcon className="w-8 h-8 ml-1" />
                        </div>
                    </div>
                </div>

                {/* Quick Actions Strip */}
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { icon: <MapIcon className="w-6 h-6"/>, label: "Map", action: onGoToMap, color: "text-blue-400", bg: "bg-blue-400/10" },
                        { icon: <HistoryIcon className="w-6 h-6"/>, label: "History", action: onGoToHistory, color: "text-purple-400", bg: "bg-purple-400/10" },
                        { icon: <GameIcon className="w-6 h-6"/>, label: "Break Zone", action: onGoToBreakZone, color: "text-emerald-400", bg: "bg-emerald-400/10" },
                        { icon: <SettingsIcon className="w-6 h-6"/>, label: "Settings", action: onGoToSettings, color: "text-slate-400", bg: "bg-slate-400/10" },
                    ].map((item, idx) => (
                        <button key={idx} onClick={item.action} className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-900/60 border border-white/5 rounded-2xl hover:bg-slate-800 transition-colors">
                            <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
                                {item.icon}
                            </div>
                            <span className="text-xs font-semibold text-slate-300">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Main Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Vehicle Status */}
                    <WidgetCard title="Vehicle Status" icon={<CheckCircleIcon className="w-4 h-4" />}>
                        <div className="flex justify-between items-center h-full pb-2">
                             <div>
                                <h3 className="text-xl font-bold text-slate-100">{vehicle?.make || 'No Vehicle'} {vehicle?.model}</h3>
                                <p className="text-sm text-slate-500 font-mono mt-1 tracking-wider bg-slate-950/50 px-2 py-1 rounded inline-block border border-slate-800">
                                    {vehicle?.license_plate || '--- ---'}
                                </p>
                             </div>
                             <button onClick={onManageVehicle} className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                                <PencilIcon className="w-5 h-5" />
                             </button>
                        </div>
                    </WidgetCard>

                    {/* Weather */}
                    <WidgetCard title="Local Conditions">
                        <WeatherWidget />
                    </WidgetCard>

                    {/* Safety Tip (Full Width on mobile, span 2 on desktop if needed) */}
                    <div className="md:col-span-2">
                        <WidgetCard className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-amber-500/20">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                                    <LightbulbIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wide mb-1">Daily Safety Insight</h3>
                                    <p className="text-slate-200 text-sm leading-relaxed font-medium">"{safetyTip || 'Loading insight...'}"</p>
                                </div>
                            </div>
                        </WidgetCard>
                    </div>

                    {/* Last Trip Stats */}
                    <div className="md:col-span-2">
                         <WidgetCard 
                            title="Recent Activity" 
                            icon={<HistoryIcon className="w-4 h-4"/>} 
                            onClick={lastTripReport ? onViewReport : undefined}
                            action={lastTripReport ? <ChevronRightIcon className="w-5 h-5 text-slate-500" /> : null}
                        >
                            {lastTripReport ? (
                                <div className="grid grid-cols-3 gap-4 pt-2">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-slate-500 uppercase font-bold">Duration</span>
                                        <div className="flex items-center gap-2 text-slate-200">
                                            <ClockIcon className="w-4 h-4 text-blue-500" />
                                            <span className="text-xl font-bold">{Math.round((lastTripReport.endTime - lastTripReport.startTime) / 60000)}m</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 border-l border-slate-800 pl-4">
                                        <span className="text-xs text-slate-500 uppercase font-bold">Max Fatigue</span>
                                        <div className="flex items-center gap-2 text-slate-200">
                                            <PeakIcon className="w-4 h-4 text-red-500" />
                                            <span className="text-xl font-bold">{lastTripReport.maxDrowsiness}%</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 border-l border-slate-800 pl-4">
                                        <span className="text-xs text-slate-500 uppercase font-bold">Alerts</span>
                                        <div className="flex items-center gap-2 text-slate-200">
                                            <AlertIcon className="w-4 h-4 text-amber-500" />
                                            <span className="text-xl font-bold">{lastTripReport.alertCount}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-6 text-center text-slate-500 text-sm">
                                    No recent trips recorded.
                                </div>
                            )}
                        </WidgetCard>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
