import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BackIcon, PlayIcon } from './icons';

interface AlarmSettings {
  sound: string;
  volume: number;
  vibration: boolean;
}

const alarmSounds = [
    { id: 'alarm_clock', name: 'Alarm Clock', url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
    { id: 'digital_watch_alarm', name: 'Digital Watch', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
    { id: 'dosimeter_alarm', name: 'Dosimeter', url: 'https://actions.google.com/sounds/v1/alarms/dosimeter_alarm.ogg' },
    { id: 'bugle_tune', name: 'Bugle Tune', url: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg' },
];

const AlarmSettingsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [settings, setSettings] = useState<AlarmSettings>({
    sound: 'alarm_clock',
    volume: 0.8,
    vibration: true,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    const audioElement = audioRef.current;

    try {
      const savedSettings = localStorage.getItem('truawake_alarm_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Failed to load alarm settings:", errorMessage);
    }

    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('truawake_alarm_settings', JSON.stringify(settings));
    } catch(e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Failed to save alarm settings:", errorMessage);
    }
  }, [settings]);

  const handleSettingChange = <K extends keyof AlarmSettings>(key: K, value: AlarmSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const playSound = useCallback((withVibration: boolean) => {
    const selectedSound = alarmSounds.find(s => s.id === settings.sound);
    if (selectedSound && audioRef.current) {
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      audio.src = selectedSound.url;
      audio.volume = settings.volume;
      audio.play().catch(e => {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("Error playing audio:", errorMessage);
      });

      if (withVibration && settings.vibration) {
        navigator.vibrate?.([200, 100, 200]);
      }
    }
  }, [settings]);

  return (
    <div className="flex flex-col h-full p-4 bg-pro-gradient overflow-y-auto">
      <header className="flex items-center mb-6 relative">
        <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-slate-800 transition">
          <BackIcon className="w-6 h-6"/>
        </button>
        <h1 className="text-2xl font-bold text-slate-100">Alarm Settings</h1>
      </header>
      <div className="w-full max-w-md mx-auto">
        <div className="bg-slate-900/70 p-8 rounded-2xl border border-slate-700/50 space-y-6">
          
          <div>
            <label htmlFor="alarmSound" className="block text-slate-300 text-sm font-bold mb-2">Alarm Sound</label>
            <div className="flex items-center space-x-2">
                <select
                id="alarmSound"
                value={settings.sound}
                onChange={(e) => handleSettingChange('sound', e.target.value)}
                className="flex-grow px-3 py-2 text-slate-100 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                {alarmSounds.map(sound => <option key={sound.id} value={sound.id}>{sound.name}</option>)}
                </select>
                <button
                    type="button"
                    onClick={() => playSound(false)}
                    className="flex-shrink-0 p-3 rounded-full bg-slate-700 hover:bg-slate-600 transition text-white"
                    aria-label="Preview sound"
                >
                    <PlayIcon className="w-5 h-5" />
                </button>
            </div>
          </div>

          <div>
             <label htmlFor="volume" className="block text-slate-300 text-sm font-bold mb-2">
                Volume <span className="text-slate-400 font-normal">({Math.round(settings.volume * 100)}%)</span>
            </label>
            <input
              id="volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.volume}
              onChange={(e) => handleSettingChange('volume', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-sm font-bold">Enable Vibration</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.vibration} onChange={(e) => handleSettingChange('vibration', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="pt-4">
            <button onClick={() => playSound(true)} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg">
              Test Alarm
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AlarmSettingsPage;