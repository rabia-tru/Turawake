import React, { useState, useEffect } from 'react';
import { BackIcon } from './icons';
import { getPowerSettings, savePowerSettings, PowerSettings } from '../services/settingsService';

const PowerSettingsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [settings, setSettings] = useState<PowerSettings>({
    batterySaverEnabled: false,
  });

  useEffect(() => {
    setSettings(getPowerSettings());
  }, []);
  
  const handleToggleBatterySaver = () => {
    const newSettings = { ...settings, batterySaverEnabled: !settings.batterySaverEnabled };
    setSettings(newSettings);
    savePowerSettings(newSettings);
  };

  return (
    <div className="flex flex-col h-full p-4 bg-pro-gradient overflow-y-auto">
      <header className="flex items-center mb-6 relative">
        <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-slate-800 transition">
          <BackIcon className="w-6 h-6"/>
        </button>
        <h1 className="text-2xl font-bold text-slate-100">Power & Performance</h1>
      </header>
      <div className="w-full max-w-md mx-auto">
        <div className="bg-slate-900/70 p-8 rounded-2xl border border-slate-700/50 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-slate-200 font-bold">Battery Saver Mode</span>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">Reduces camera quality and analysis frequency to extend battery life. Detection may be less responsive.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.batterySaverEnabled} onChange={handleToggleBatterySaver} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PowerSettingsPage;
