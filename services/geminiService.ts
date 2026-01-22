
import { GoogleGenAI, Type } from "@google/genai";
import { DrowsinessApiResponse, SensorData, EnvironmentContext } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Custom error for handling rate limit responses from the API
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

const drowsinessSchema = {
  type: Type.OBJECT,
  properties: {
    drowsinessLevel: {
      type: Type.NUMBER,
      description: "A numerical score from 0 (fully awake) to 100 (very drowsy).",
    },
    isDrowsy: {
      type: Type.BOOLEAN,
      description: "True if drowsiness level is > 70.",
    },
    cues: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of cues: 'Yawn', 'PERCLOS > 80%', 'Head Droop', 'Slow Blink', 'Eyes Closed'.",
    },
  },
  required: ["drowsinessLevel", "isDrowsy", "cues"],
};

const generatePrompt = (sensorData: SensorData, context: EnvironmentContext | null) => {
    let contextPrompt = `
      **Sensitivity Guidelines:**
      - Standard driving mode. Differentiate between normal checks (mirror checking) and fatigue.
    `;

    if (context) {
        const { roadType, timeOfDay, weather, speed } = context;
        const isHighRisk = roadType === 'highway' || timeOfDay === 'night' || (weather && ![0, 1, 2, 3].includes(weather.code));

        contextPrompt = `
          **Context:** Road: ${roadType}, Time: ${timeOfDay}, Weather: ${weather?.description || 'N/A'}.
          **Sensitivity:** ${isHighRisk ? 'HIGH RISK. Be extremely sensitive to micro-sleep signs.' : 'Standard sensitivity.'}
        `;
    }

    return `
      Analyze the driver's face for drowsiness using the PERCLOS (Percentage of Eye Closure) standard.

      **CRITICAL INDICATORS (Detect these specific signs):**
      1.  **PERCLOS (Eye Closure):** Are eyes more than 80% closed? This is the strongest sign of micro-sleep.
      2.  **Yawning:** Check mouth openness.
      3.  **Head Tilt/Nod:** Check for forward nodding or lateral head droop. Compare with accelerometer Z-axis: ${sensorData.az.toFixed(2)}.
      4.  **Blink Rate:** Look for slow, heavy blinks.

      **Input Data:**
      - **Image:** Driver face.
      - **Sensors:** Accel(${sensorData.ax.toFixed(1)}, ${sensorData.ay.toFixed(1)}, ${sensorData.az.toFixed(1)}), Gyro(${sensorData.alpha.toFixed(1)}, ${sensorData.beta.toFixed(1)}, ${sensorData.gamma.toFixed(1)}).
      
      **Output:**
      - Return JSON. 'drowsinessLevel' (0-100). If Yawn OR PERCLOS > 80% is detected, level must be > 75.
    `;
};

export const analyzeDrowsiness = async (base64Image: string, sensorData: SensorData, context: EnvironmentContext | null): Promise<DrowsinessApiResponse | null> => {
  try {
    const prompt = generatePrompt(sensorData, context);

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };

    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [imagePart, textPart],
        config: {
            responseMimeType: "application/json",
            responseSchema: drowsinessSchema,
        }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("The AI service returned an empty response.");
    }
    return JSON.parse(jsonText.trim()) as DrowsinessApiResponse;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error analyzing frame with Gemini:", error);

    if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("exceeded your current quota") || errorMessage.includes("429")) {
        throw new RateLimitError("API rate limit exceeded.");
    }

    throw new Error('The AI analysis service is currently unavailable.');
  }
};


const safetyTipsSchema = {
    type: Type.OBJECT,
    properties: {
        tips: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of 5 to 10 unique and concise driver safety tips.",
        },
    },
    required: ["tips"],
};

const TIPS_CACHE_KEY = 'truawake_safety_tips_cache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface TipsCache {
  timestamp: number;
  tips: string[];
}


const fetchSafetyTips = async (): Promise<string[] | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Provide a list of 5 to 10 short, impactful driver safety tips. Make them concise and easy to remember. Examples: "Only pass when it is safe and legal to do so.", "Maintain a safe following distance."',
            config: {
                responseMimeType: "application/json",
                responseSchema: safetyTipsSchema,
            }
        });

        const jsonText = response.text;
        if (!jsonText) {
            console.warn("Gemini returned empty response for safety tips.");
            return [];
        }
        const parsed = JSON.parse(jsonText.trim());
        return parsed.tips || [];
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("exceeded your current quota") || errorMessage.includes("429")) {
            return null; 
        }
        return [];
    }
};

export const getSafetyTip = async (): Promise<string> => {
    const fallbackTips = [
        "Always wear your seatbelt.",
        "Check your tire pressure regularly.",
        "Never text and drive.",
        "Maintain a safe following distance of at least 3 seconds.",
        "Check your mirrors frequently.",
        "Adjust your seat and mirrors before you start driving.",
        "Don't drive when you're tired or stressed.",
        "Be aware of your blind spots."
    ];
    
    let cachedTips: string[] = [];

    try {
        const cachedData = localStorage.getItem(TIPS_CACHE_KEY);
        if (cachedData) {
            const cache: TipsCache = JSON.parse(cachedData);
            if (Date.now() - cache.timestamp < CACHE_DURATION_MS && cache.tips.length > 0) {
                return cache.tips[Math.floor(Math.random() * cache.tips.length)];
            }
            cachedTips = cache.tips;
        }
    } catch (e) {
        console.error("Failed to read safety tips from cache:", e);
    }

    const fetchedTips = await fetchSafetyTips();

    if (fetchedTips === null) {
        if(cachedTips.length > 0) {
            return cachedTips[Math.floor(Math.random() * cachedTips.length)];
        }
        return "Safety tips unavailable due to API limits.";
    }
    
    if (fetchedTips.length > 0) {
        try {
            const newCache: TipsCache = { timestamp: Date.now(), tips: fetchedTips };
            localStorage.setItem(TIPS_CACHE_KEY, JSON.stringify(newCache));
        } catch (e) {
            console.error("Failed to save safety tips to cache:", e);
        }
        return fetchedTips[Math.floor(Math.random() * fetchedTips.length)];
    }
    
    const tipsToUse = cachedTips.length > 0 ? cachedTips : fallbackTips;
    return tipsToUse[Math.floor(Math.random() * tipsToUse.length)];
};
