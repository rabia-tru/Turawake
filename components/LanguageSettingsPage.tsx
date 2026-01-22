
import React, { useState, useEffect } from 'react';
import { BackIcon, CheckCircleIcon } from './icons';
import { getLanguage, saveLanguage } from '../services/settingsService';
import { Language } from '../types';

const languages: { code: Language; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ur', name: 'Urdu (اردو)' },
];

const LanguageSettingsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [currentLang, setCurrentLang] = useState<Language>('en');

    useEffect(() => {
        setCurrentLang(getLanguage());
    }, []);

    const handleSelect = (code: Language) => {
        setCurrentLang(code);
        saveLanguage(code);
    };

    return (
        <div className="flex flex-col h-full p-4 bg-pro-gradient overflow-y-auto">
            <header className="flex items-center mb-6 relative">
                <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-slate-800 transition">
                    <BackIcon className="w-6 h-6"/>
                </button>
                <h1 className="text-2xl font-bold text-slate-100">Language</h1>
            </header>
            <div className="w-full max-w-md mx-auto">
                <div className="bg-slate-900/70 p-6 rounded-2xl border border-slate-700/50 space-y-3">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleSelect(lang.code)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                                currentLang === lang.code 
                                ? 'bg-blue-600/20 border-blue-500' 
                                : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                            }`}
                        >
                            <span className="text-lg font-medium text-slate-100">{lang.name}</span>
                            {currentLang === lang.code && <CheckCircleIcon className="w-6 h-6 text-blue-400" />}
                        </button>
                    ))}
                </div>
                <p className="text-center text-slate-500 text-sm mt-6">Restart app to fully apply changes.</p>
            </div>
        </div>
    );
};

export default LanguageSettingsPage;
