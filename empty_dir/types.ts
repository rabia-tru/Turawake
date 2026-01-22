
export enum Page {
  Welcome,
  Login,
  DriverRegistration,
  Dashboard,
  Monitoring,
  Report,
  VehicleManagement,
  VehicleVerification,
  Permissions,
  Settings,
  ProfileSettings,
  AlarmSettings,
  ThemeSettings,
  Map,
  PowerSettings,
  History,
  BreakZone,
}

export interface Profile {
    id: string;
    updated_at?: string;
    full_name: string | null;
    phone_number: string | null;
    date_of_birth: string | null; // Stored as 'YYYY-MM-DD'
    address: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
}

export interface SensorData {
  ax: number;
  ay: number;
  az: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface DrowsinessEvent {
  timestamp: number;
  level: number;
  cues: string[];
}

export type DrivingManeuverType = 'Harsh Braking' | 'Sudden Acceleration' | 'Sharp Turn';

export interface DrivingManeuverEvent {
  timestamp: number;
  type: DrivingManeuverType;
}

export interface TripReport {
  startTime: number;
  endTime: number;
  events: DrowsinessEvent[];
  maneuvers: DrivingManeuverEvent[];
  maxDrowsiness: number;
  alertCount: number;
  yawnCount: number;
}

export interface DrowsinessApiResponse {
    drowsinessLevel: number; // A number from 0 to 100
    isDrowsy: boolean;
    cues: string[]; // e.g., ["Yawn detected", "Eyes closed", "Sudden head movement"]
}

export interface Vehicle {
    id?: string;
    user_id: string;
    license_plate: string;
    make: string;
    model: string;
    year: number;
    is_verified: boolean;
}

// Environmental Context Types for AI Sensitivity Adjustment
export type RoadType = 'highway' | 'city' | 'unknown';
export type TimeOfDay = 'day' | 'night';

export interface WeatherInfo {
    description: string;
    code: number;
    temp: number | null;
}

export interface EnvironmentContext {
    roadType: RoadType;
    timeOfDay: TimeOfDay;
    weather: WeatherInfo | null;
    speed: number | null; // Speed in km/h
}

export type Language = 'en' | 'es' | 'fr' | 'de' | 'ur'; 
