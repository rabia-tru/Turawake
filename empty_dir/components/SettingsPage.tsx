
import React from 'react';
import { BackIcon, UserCircleIcon, BellIcon, PaletteIcon, ChevronRightIcon, BoltIcon } from './icons';

interface SettingsPageProps {
  onBack: () => void;
  onGoToProfile: () => void;
  onGoToAlarms: () => void;
  onGoToTheme: () => void;
  onGoToPowerSettings: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, onGoToProfile, onGoToAlarms, onGoToTheme, onGoToPowerSettings }) => {

  const settingsItems = [
    { label: 'Profile', icon: <UserCircleIcon className="w-6 h-6 text-blue-400" />, action: onGoToProfile },
    { label: 'Alarm Settings', icon: <BellIcon className="w-6 h-6 text-green-400" />, action: onGoToAlarms },
    { label: 'Theme & Appearance', icon: <PaletteIcon className="w-6 h-6 text-purple-400" />, action: onGoToTheme },
    { label: 'Power & Performance', icon: <BoltIcon className="w-6 h-6 text-yellow-400" />, action: onGoToPowerSettings },
  ];

  return (
    <div className="flex flex-col h-full p-4 bg-pro-gradient overflow-y-auto">
        <header className="flex items-center mb-6 relative">
            <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-slate-800 transition">
                <BackIcon className="w-6 h-6"/>
            </button>
            <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        </header>

        <div className="w-full max-w-md mx-auto">
            <div className="bg-slate-900/70 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-6 space-y-2">
                {settingsItems.map((item) => (
                    <button
                        key={item.label}
                        onClick={item.action}
                        className="w-full flex items-center p-4 rounded-lg hover:bg-slate-800/60 transition-colors duration-200 text-left"
                    >
                        <div className="p-2 bg-slate-800 rounded-full mr-4">
                            {item.icon}
                        </div>
                        <span className="flex-grow text-slate-200 font-medium">{item.label}</span>
                        <ChevronRightIcon className="w-5 h-5 text-slate-500" />
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
};

export default SettingsPage;
