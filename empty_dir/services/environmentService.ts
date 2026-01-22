import { RoadType, TimeOfDay, WeatherInfo } from '../types';

// Helper to route requests through a CORS proxy to bypass potential sandbox restrictions.
const proxiedFetch = (url: string, options?: RequestInit) => {
    const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    return fetch(proxiedUrl, options);
};

// Cache to avoid spamming the reverse geocoding API for the same location
const roadTypeCache = new Map<string, RoadType>();

/**
 * Determines the type of road from latitude and longitude using the Nominatim API.
 * @param lat Latitude
 * @param lon Longitude
 * @returns {Promise<RoadType>} 'highway', 'city', or 'unknown'
 */
export const getRoadType = async (lat: number, lon: number): Promise<RoadType> => {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (roadTypeCache.has(cacheKey)) {
        return roadTypeCache.get(cacheKey) as RoadType;
    }

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const response = await proxiedFetch(url);
        if (!response.ok) {
            console.warn(`Nominatim API failed with status: ${response.status}`);
            return 'unknown';
        }
        const data = await response.json();

        const road = data.address?.road;
        const highwayType = data.address?.highway;
        // OSM classification for major highways
        const highwayClasses = ['motorway', 'trunk', 'motorway_link', 'trunk_link'];
        
        let result: RoadType = 'unknown';
        if (highwayType && highwayClasses.includes(highwayType)) {
            result = 'highway';
        } else if (road) {
            result = 'city';
        }

        roadTypeCache.set(cacheKey, result);
        // Clear cache after 5 minutes to allow for updates
        setTimeout(() => roadTypeCache.delete(cacheKey), 5 * 60 * 1000);
        
        return result;

    } catch (error) {
        console.error("Error fetching road type:", error);
        return 'unknown';
    }
};

/**
 * Fetches current weather data from the Open-Meteo API.
 * @param latitude 
 * @param longitude 
 * @returns {Promise<{temp: number, code: number, description: string} | null>}
 */
export const getWeather = async (latitude: number, longitude: number): Promise<{temp: number, code: number, description: string} | null> => {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`;
        const response = await proxiedFetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch weather data.');
        }
        const data = await response.json();
        if (data.current) {
            const code = data.current.weather_code;
            return {
                temp: data.current.temperature_2m,
                code: code,
                description: getWeatherDescription(code)
            };
        }
        return null;
    } catch (err) {
        console.error("Weather fetch error:", err);
        return null;
    }
};

/**
 * Determines if it's currently day or night.
 * @returns {TimeOfDay} 'day' or 'night'
 */
export const getTimeOfDay = (): TimeOfDay => {
    const hours = new Date().getHours();
    // Considers night to be from 8 PM (20) to 6 AM (6)
    return hours >= 20 || hours < 6 ? 'night' : 'day';
};

/**
 * Converts WMO weather code to a human-readable string.
 * @param code The WMO weather code number
 * @returns {string} A descriptive string for the weather.
 */
const getWeatherDescription = (code: number): string => {
    const descriptions: { [key: number]: string } = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        66: 'Light freezing rain', 67: 'Heavy freezing rain',
        71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
        85: 'Slight snow showers', 86: 'Heavy snow showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
    };
    return descriptions[code] || 'Unknown';
};