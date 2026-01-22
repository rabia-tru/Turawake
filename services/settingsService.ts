
// services/settingsService.ts
import { Language } from '../types';

export interface PowerSettings {
  batterySaverEnabled: boolean;
}

const POWER_SETTINGS_KEY = 'truawake_power_settings';
const LANGUAGE_SETTINGS_KEY = 'truawake_language_settings';

/**
 * Retrieves the current power settings from localStorage.
 * @returns {PowerSettings} The saved power settings or default values.
 */
export const getPowerSettings = (): PowerSettings => {
  try {
    const savedSettings = localStorage.getItem(POWER_SETTINGS_KEY);
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (e) {
    console.error("Failed to load power settings:", e);
  }
  // Return default settings if none are found or if an error occurs
  return {
    batterySaverEnabled: false,
  };
};

/**
 * Saves the power settings to localStorage.
 * @param {PowerSettings} settings - The settings object to save.
 */
export const savePowerSettings = (settings: PowerSettings): void => {
  try {
    localStorage.setItem(POWER_SETTINGS_KEY, JSON.stringify(settings));
  } catch(e) {
    console.error("Failed to save power settings:", e);
  }
};

export const getLanguage = (): Language => {
  try {
    const lang = localStorage.getItem(LANGUAGE_SETTINGS_KEY);
    return (lang as Language) || 'en';
  } catch (e) {
    return 'en';
  }
};

export const saveLanguage = (lang: Language): void => {
  try {
    localStorage.setItem(LANGUAGE_SETTINGS_KEY, lang);
  } catch(e) {
    console.error("Failed to save language:", e);
  }
}
