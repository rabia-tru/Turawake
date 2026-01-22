import React, { useState, useEffect, useCallback } from 'react';
import { BackIcon } from './icons';

type Theme = 'dark' | 'light';

interface ThemeSettings {
  theme: Theme;
  accentColor: string;
}

const accentColors = [
    '#3b82f6', // blue-500
    '#22c55e', // green-500
    '#a855f7', // purple-500
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
];

const ThemeSettingsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [settings, setSettings] = useState<ThemeSettings>({
    theme: 'dark',
    accentColor: '#3b82f6',
  });

  const applyTheme = useCallback((theme: Theme, accentColor: string) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.setProperty('--accent-color', accentColor);
  }, []);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('truawake_theme_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        applyTheme(parsed.theme, parsed.accentColor);
      } else {
        applyTheme(settings.theme, settings.accentColor);
      }
    } catch (e) {
      console.error("Failed to load theme settings:", e);
    }
  }, [applyTheme]);

  const handleSettingChange = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    applyTheme(newSettings.theme, newSettings.accentColor);
     try {
      localStorage.setItem('truawake_theme_settings', JSON.stringify(newSettings));
    } catch(e) {
      console.error("Failed to save theme settings:", e);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 bg-pro-gradient overflow-y-auto">
      <header className="flex items-center mb-6 relative">
        <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-slate-800 transition">
          <BackIcon className="w-6 h-6"/>
        </button>
        <h1 className="text-2xl font-bold text-slate-100">Theme & Appearance</h1>
      </header>
      <div className="w-full max-w-md mx-auto">
        <div className="bg-slate-900/70 p-8 rounded-2xl border border-slate-700/50 space-y-6">
            
            <div>
                <h3 className="block text-slate-300 text-sm font-bold mb-2">Theme</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleSettingChange('theme', 'dark')}
                        className={`p-4 rounded-lg text-center border-2 ${settings.theme === 'dark' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800'}`}
                    >
                        <span className="font-semibold">Dark</span>
                    </button>
                     <button
                        onClick={() => handleSettingChange('theme', 'light')}
                        className={`p-4 rounded-lg text-center border-2 ${settings.theme === 'light' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800'}`}
                    >
                        <span className="font-semibold">Light</span>
                    </button>
                </div>
            </div>

             <div>
                <h3 className="block text-slate-300 text-sm font-bold mb-2">Accent Color</h3>
                 <div className="grid grid-cols-6 gap-3">
                    {accentColors.map(color => (
                        <button
                            key={color}
                            onClick={() => handleSettingChange('accentColor', color)}
                            className={`w-10 h-10 rounded-full transition transform hover:scale-110 ${settings.accentColor === color ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white' : ''}`}
                            style={{ backgroundColor: color }}
                            aria-label={`Select ${color} accent color`}
                        />
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettingsPage;